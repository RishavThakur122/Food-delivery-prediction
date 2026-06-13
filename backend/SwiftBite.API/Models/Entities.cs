using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SwiftBite.API.Models;

public class UserEntity
{
    [Key]
    public int UserId { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class OrderEntity
{
    [Key]
    [MaxLength(8)]
    public string OrderId { get; set; } = "";
    public int UserId { get; set; }
    public string Status { get; set; } = "Waiting for driver";
    public string? DriverId { get; set; }
    public double UserLat { get; set; }
    public double UserLng { get; set; }
    public double RestaurantLat { get; set; }
    public double RestaurantLng { get; set; }
    public int? OriginalEtaMinutes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeliveredAt { get; set; }

    [ForeignKey("UserId")]
    public UserEntity? User { get; set; }
}

public class DelayAlertEntity
{
    [Key]
    public int AlertId { get; set; }
    public string OrderId { get; set; } = "";
    public int ExtraMinutes { get; set; }
    public string Reason { get; set; } = "";
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("OrderId")]
    public OrderEntity? Order { get; set; }
}

public class AgentLocationEntity
{
    [Key]
    public long LocationId { get; set; }
    public string OrderId { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? SpeedKmh { get; set; }
    public double? Heading { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("OrderId")]
    public OrderEntity? Order { get; set; }
}