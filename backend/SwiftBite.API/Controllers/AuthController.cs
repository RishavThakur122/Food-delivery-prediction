using Microsoft.AspNetCore.Mvc;
using SwiftBite.API.DTOs;
using SwiftBite.API.Services;

namespace SwiftBite.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("register")]
    public async Task<ActionResult> Register(RegisterDto dto)
    {
        var (success, error, result) = await _auth.RegisterAsync(dto);
        return success ? Ok(result) : BadRequest(new { error });
    }

    [HttpPost("login")]
    public async Task<ActionResult> Login(LoginDto dto)
    {
        var (success, error, result) = await _auth.LoginAsync(dto);
        return success ? Ok(result) : Unauthorized();
    }
}
