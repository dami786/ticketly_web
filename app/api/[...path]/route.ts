import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL } from "../../../lib/config";

// For uploads, the backend serves files directly without /api prefix
// So we need to handle /uploads paths specially
const isUploadPath = (path: string) => path.startsWith("uploads/");

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, "DELETE");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, "PATCH");
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join("/");
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    
    // For upload paths, backend serves them directly without /api prefix
    // For API paths, backend expects /api prefix
    let fullPath: string;
    if (isUploadPath(path)) {
      // Remove /api from BACKEND_API_URL and append the upload path
      const backendOrigin = BACKEND_API_URL.replace(/\/api\/?$/, "");
      fullPath = `${backendOrigin}/${path}${searchParams ? `?${searchParams}` : ""}`;
    } else {
      // For API calls, use full BACKEND_API_URL
      fullPath = `${BACKEND_API_URL}/${path}${searchParams ? `?${searchParams}` : ""}`;
    }

    // Get authorization header from request
    const authHeader = request.headers.get("authorization");
    
    // Prepare headers
    const headers: any = {};
    
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    // Get request body if present
    let body: string | FormData | undefined;
    const contentType = request.headers.get("content-type") || "";
    
    // Log for debugging
    if (process.env.NODE_ENV === "development") {
      console.log(`[Proxy] ${method} ${path}`);
      console.log(`[Proxy] Content-Type: ${contentType || "(not set)"}`);
    }
    
    if (method !== "GET" && method !== "DELETE") {
      // Check if it's FormData by content-type header or path
      // Note: axios might not send content-type for FormData (browser sets it with boundary)
      // So we check if the path is an upload endpoint
      const isUploadEndpoint = path.includes("upload") || path.includes("upload-profile-image");
      
      // Try to detect FormData - check content-type or upload endpoint
      const isFormData = contentType.includes("multipart/form-data") || isUploadEndpoint;
      
      if (process.env.NODE_ENV === "development") {
        console.log(`[Proxy] Is upload endpoint: ${isUploadEndpoint}`);
        console.log(`[Proxy] Is FormData: ${isFormData}`);
      }
      
      if (isFormData) {
        try {
          // Try to read as FormData first
          body = await request.formData();
          
          // Log FormData contents for debugging
          if (process.env.NODE_ENV === "development") {
            const entries = Array.from(body.entries());
            console.log(`[Proxy] ✅ FormData detected, entries: ${entries.length}`);
            entries.forEach(([key, value]) => {
              if (value instanceof File) {
                console.log(`[Proxy]   - ${key}: File (${value.name}, ${value.type}, ${value.size} bytes)`);
              } else {
                console.log(`[Proxy]   - ${key}: ${value}`);
              }
            });
          }
          
          // Don't set Content-Type for FormData - fetch will set it with boundary automatically
        } catch (error) {
          console.error("[Proxy] ❌ Error reading FormData:", error);
          // If FormData read fails, try as text (shouldn't happen, but fallback)
          try {
            body = await request.text();
            if (body) {
              headers["Content-Type"] = contentType || "application/json";
            }
          } catch (textError) {
            console.error("[Proxy] ❌ Error reading as text:", textError);
            body = undefined;
          }
        }
      } else {
        // For other content types, get as text
        try {
          body = await request.text();
          if (body) {
            headers["Content-Type"] = contentType || "application/json";
          }
        } catch (error) {
          console.error("[Proxy] ❌ Error reading request body:", error);
          body = undefined;
        }
      }
    }

    // Make request to backend
    if (process.env.NODE_ENV === "development") {
      console.log(`[Proxy] Forwarding to: ${fullPath}`);
      console.log(`[Proxy] Method: ${method}`);
      console.log(`[Proxy] Headers:`, Object.keys(headers).length > 0 ? Object.keys(headers) : "none");
      console.log(`[Proxy] Body type: ${body instanceof FormData ? "FormData" : typeof body}`);
    }
    
    const response = await fetch(fullPath, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body as any,
    });
    
    if (process.env.NODE_ENV === "development") {
      console.log(`[Proxy] Backend response status: ${response.status}`);
    }

    // Check if response is an image or binary data
    const responseContentType = response.headers.get("content-type") || "";
    const isImage = responseContentType.startsWith("image/");
    const isBinary = responseContentType.includes("octet-stream") || responseContentType.includes("application/pdf");

    if (isImage || isBinary) {
      // For images and binary files, return as blob
      const blob = await response.blob();
      return new NextResponse(blob, {
        status: response.status,
        headers: {
          "Content-Type": responseContentType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Cache-Control": "public, max-age=31536000, immutable", // Cache images for 1 year
        },
      });
    }

    // For JSON/text responses, parse as before
    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }

    // Return response with CORS headers
    return NextResponse.json(jsonData, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Proxy request failed" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

