export async function POST(req: Request) {
  try {
    const body = await req.json();
    const response = await fetch(process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ success: false, message: "Invalid server response" }), { status: 500 });
    }

    return new Response(JSON.stringify(json), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message || "Server error" }), { status: 500 });
  }
}
