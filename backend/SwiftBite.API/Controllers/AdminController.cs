using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SwiftBite.API.Data;

namespace SwiftBite.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("users")]
    public async Task<ActionResult> GetAllUsers()
    {
        var users = await _db.Users
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.UserId,
                u.Name,
                u.Email,
                u.Role,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("orders")]
    public async Task<ActionResult> GetAllOrders()
    {
        var orders = await _db.Orders
            .Include(o => o.User)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                o.OrderId,
                o.Status,
                o.DriverId,
                CustomerName = o.User != null ? o.User.Name : "Unknown",
                CustomerEmail = o.User != null ? o.User.Email : "",
                o.OriginalEtaMinutes,
                o.CreatedAt,
                o.DeliveredAt
            })
            .ToListAsync();

        return Ok(orders);
    }
}
