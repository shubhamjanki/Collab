// lib/api/documents.ts
export async function saveDocument(documentId: string, content: string) {
    if (!documentId) throw new Error("Document ID is required");

    const url = `/api/documents/${documentId}`;
    console.log(`[API] Fetching ${url}`);

    const response = await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[API] Save failed:", response.status, errorData);
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    return response.json();
}

export async function getDocument(documentId: string) {
    const response = await fetch(`/api/documents/${documentId}`);

    if (!response.ok) {
        throw new Error("Failed to fetch document");
    }

    return response.json();
}
