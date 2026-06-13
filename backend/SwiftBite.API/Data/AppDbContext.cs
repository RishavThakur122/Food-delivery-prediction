using Microsoft.EntityFrameworkCore;
using SwiftBite.API.Models;

namespace SwiftBite.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<UserEntity> Users { get; set; }
    public DbSet<OrderEntity> Orders { get; set; }
    public DbSet<DelayAlertEntity> DelayAlerts { get; set; }
    public DbSet<AgentLocationEntity> AgentLocations { get; set; }

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<UserEntity>().HasIndex(u => u.Email).IsUnique();
        mb.Entity<OrderEntity>().HasIndex(o => o.Status);
        mb.Entity<AgentLocationEntity>().HasIndex(a => a.RecordedAt);
    }
}