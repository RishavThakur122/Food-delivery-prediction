using System.Text;
using System.Text.Json;

namespace SwiftBite.API.Services;

public class OllamaService
{
    private readonly HttpClient _http;
    private readonly string _model;
    private readonly string _url;

    public OllamaService(IConfiguration config)
    {
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        _url = config["Ollama:Url"] ?? "http://localhost:11434/api/generate";
        _model = config["Ollama:Model"] ?? "llama3";
    }

    //Predict delivery time in minutes 
    public async Task<int> PredictMinutes(double distanceKm, double speedKmh, int hour)
    {
        var prompt = $"A delivery driver is {distanceKm:F1} km away moving at {speedKmh:F0} kmh. " +
                     $"Current time is {hour}:00. " +
                     $"Predict delivery time in minutes considering traffic. " +
                     $"Reply ONLY with valid JSON like this: {{\"minutes\":18}}";

        var raw = await Ask(prompt);

        try
        {
            // extract JSON from response
            var start = raw.IndexOf('{');
            var end = raw.LastIndexOf('}');
            if (start >= 0 && end > start)
            {
                var json = raw.Substring(start, end - start + 1);
                var doc = JsonDocument.Parse(json);
                return doc.RootElement.GetProperty("minutes").GetInt32();
            }
        }
        catch { }

        // fallback — simple math if Ollama response can't be parsed
        var fallback = (distanceKm / Math.Max(speedKmh, 5)) * 60 * 1.2;
        return (int)Math.Round(fallback);
    }

    // Generate delay reason text
    public async Task<string> GenerateReason(double distanceKm, double speedKmh, int extraMinutes)
    {
        var prompt = $"A food delivery is running {extraMinutes} minutes late. " +
                     $"The driver is {distanceKm:F1} km away moving at {speedKmh:F0} kmh. " +
                     $"Write one short friendly sentence to inform the customer. " +
                     $"Do not mention technical details. Just a warm natural message.";

        var reason = await Ask(prompt);

        return string.IsNullOrWhiteSpace(reason)
            ? $"Your order is running about {extraMinutes} minutes late — sorry for the wait!"
            : reason.Trim();
    }

    // Shared Ollama call 
    private async Task<string> Ask(string prompt)
    {
        try
        {
            var body = JsonSerializer.Serialize(new
            {
                model = _model,
                prompt = prompt,
                stream = false
            });

            var res = await _http.PostAsync(_url,
                new StringContent(body, Encoding.UTF8, "application/json"));

            var json = await res.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(json);
            return doc.RootElement.GetProperty("response").GetString() ?? "";
        }
        catch
        {
            return "";
        }
    }
}