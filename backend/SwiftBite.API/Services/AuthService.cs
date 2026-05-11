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

    public (bool success, string error, AuthResponseDto? result) Register(RegisterDto dto)
    {
        if (_users.EmailExists(dto.Email))
            return (false, "Email already registered", null);

        var hash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
        var user = _users.Create(dto.Name, dto.Email, hash);

        return (true, "", new AuthResponseDto
        {
            Token = GenerateToken(user),
            UserId = user.UserId,
            Name = user.Name
        });
    }

    public (bool success, string error, AuthResponseDto? result) Login(LoginDto dto)
    {
        var user = _users.FindByEmail(dto.Email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return (false, "Invalid email or password", null);

        return (true, "", new AuthResponseDto
        {
            Token = GenerateToken(user),
            UserId = user.UserId,
            Name = user.Name
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
                new Claim(ClaimTypes.Email, user.Email)
            ],
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}