using System.Collections.Concurrent;
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
    private readonly ConcurrentDictionary<string, UserRecord> _byEmail = new();
    private readonly IServiceScopeFactory _scope;

    public UserStore(IServiceScopeFactory scope)
    {
        _scope = scope;
    }

    // now async — checks memory first, then DB
    public async Task<UserRecord?> FindByEmailAsync(string email)
    {
        email = email.ToLower();

        if (_byEmail.TryGetValue(email, out var cached))
            return cached;

        using var db = _scope.CreateScope()
                             .ServiceProvider
                             .GetRequiredService<AppDbContext>();

        var entity = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (entity is null) return null;

        var user = new UserRecord
        {
            UserId = entity.UserId.ToString(),
            Name = entity.Name,
            Email = entity.Email,
            PasswordHash = entity.PasswordHash,
            Role = entity.Role
        };

        _byEmail[email] = user; // cache it
        return user;
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        return await FindByEmailAsync(email) is not null;
    }

    public async Task<UserRecord> CreateAsync(string name, string email, string passwordHash)
    {
        using var db = _scope.CreateScope()
                             .ServiceProvider
                             .GetRequiredService<AppDbContext>();

        var entity = new UserEntity
        {
            Name = name,
            Email = email.ToLower(),
            PasswordHash = passwordHash
        };

        db.Users.Add(entity);
        await db.SaveChangesAsync();

        var user = new UserRecord
        {
            UserId = entity.UserId.ToString(),
            Name = entity.Name,
            Email = entity.Email,
            PasswordHash = entity.PasswordHash,
            Role = entity.Role
        };

        _byEmail[user.Email] = user;
        return user;
    }
}