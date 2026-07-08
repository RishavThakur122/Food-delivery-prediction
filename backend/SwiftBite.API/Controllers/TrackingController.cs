using Microsoft.AspNetCore.Mvc;
using SwiftBite.API.Services;

namespace SwiftBite.API.Controllers;

[ApiController]
[Route("api/tracking")]
public class TrackingController : ControllerBase
{
    private readonly TrackingStore _tracking;

    public TrackingController(TrackingStore tracking)
    {
        _tracking = tracking;
    }

    [HttpGet("{orderId}")]
    public ActionResult GetTracking(string orderId)
    {
        string check = "running proper";
        return Ok(check);
        // var snap = _tracking.Get(orderId);
        // return snap is not null ? Ok(snap) : NotFound();
    }

    [HttpGet("active")]
    public ActionResult GetAllTracking()
    {
        return Ok(_tracking.GetAll());
    }
}
