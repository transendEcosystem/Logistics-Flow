
import { NextResponse } from 'next/server';

// This API route is intentionally disabled to prevent build issues with its
// dependencies, while still allowing the rest of the application to build and run.
// The primary AI flows are accessed via Server Actions, not this HTTP endpoint.

export async function GET() {
  return NextResponse.json(
    { message: "Genkit API endpoint is not available." },
    { status: 503 }
  );
}

export async function POST() {
    return NextResponse.json(
    { message: "Genkit API endpoint is not available." },
    { status: 503 }
  );
}
