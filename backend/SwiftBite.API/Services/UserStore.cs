using System.Collections.Concurrent;

namespace SwiftBite.API.Services;

public class UserRecord
{
    public string UserId { get; set; } = Guid.NewGuid().ToString("N")[..8].ToUpper();
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
}


public class UserStore
{
    private readonly ConcurrentDictionary<string, UserRecord> _byEmail = new();

    public UserRecord? FindByEmail(string email) =>
        _byEmail.TryGetValue(email.ToLower(), out var u) ? u : null;

    public bool EmailExists(string email) =>
        _byEmail.ContainsKey(email.ToLower());

    public UserRecord Create(string name, string email, string passwordHash)
    {
        var user = new UserRecord
        {
            Name = name,
            Email = email.ToLower(),
            PasswordHash = passwordHash
        };
        _byEmail[user.Email] = user;
        return user;
    }
}