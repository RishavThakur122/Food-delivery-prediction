using Microsoft.EntityFrameworkCore;
using SwiftBite.API.Data;
using SwiftBite.API.Models;

namespace SwiftBite.API.Services;

public class UserRecord
{
    public string UserId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "customer";
}

public class UserStore
{
    private readonly AppDbContext _db;

    public UserStore(AppDbContext db)
    {
        _db = db;
    }

    public async Task<UserRecord?> FindByEmailAsync(string email)
    {
        var entity = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == email.ToLower());

        if (entity == null)
            return null;

        return new UserRecord
        {
            UserId = entity.UserId.ToString(),
            Name = entity.Name,
            Email = entity.Email,
            PasswordHash = entity.PasswordHash,
            Role = entity.Role
        };
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        return await _db.Users.AnyAsync(u => u.Email == email.ToLower());
    }

    public async Task<UserRecord> CreateAsync(
        string name,
        string email,
        string passwordHash,
        string role = "customer")
    {
        var entity = new UserEntity
        {
            Name = name,
            Email = email.ToLower(),
            PasswordHash = passwordHash,
            Role = role
        };

        _db.Users.Add(entity);
        await _db.SaveChangesAsync();

        return new UserRecord
        {
            UserId = entity.UserId.ToString(),
            Name = entity.Name,
            Email = entity.Email,
            PasswordHash = entity.PasswordHash,
            Role = entity.Role
        };
    }
}