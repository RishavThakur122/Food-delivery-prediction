using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SwiftBite.API.DTOs;

namespace SwiftBite.API.Services;

public class AuthService
{
    private readonly UserStore _users;
    private readonly IConfiguration _config;

    public AuthService(UserStore users, IConfiguration config)
    {
        _users = users;
        _config = config;
    }

    public async Task<(bool success, string error, AuthResponseDto? result)> RegisterAsync(RegisterDto dto)
    {
        if (await _users.EmailExistsAsync(dto.Email))
            return (false, "Email already registered", null);

        var hash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        var user = await _users.CreateAsync(dto.Name, dto.Email, hash,dto.Role);

        return (true, "", new AuthResponseDto
        {
            Token = GenerateToken(user),
            UserId = user.UserId,
            Name = user.Name,
            Role = user.Role
        });
    }
    public async Task<(bool success, string error, AuthResponseDto? result)> LoginAsync(LoginDto dto)
    {
        var user = await _users.FindByEmailAsync(dto.Email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return (false, "Invalid email or password", null);

        return (true, "", new AuthResponseDto
        {
            Token = GenerateToken(user),
            UserId = user.UserId,
            Name = user.Name,
             Role = user.Role
        });
    }
    private string GenerateToken(UserRecord user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: [
                new Claim("userId", user.UserId),
                new Claim("name",   user.Name),
                 new Claim("role",   user.Role),
                new Claim(ClaimTypes.Email, user.Email)
            ],
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}