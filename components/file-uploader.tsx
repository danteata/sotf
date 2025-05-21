"use client";

import { useState } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import { UploadDropzone } from "@uploadthing/react";

import { Button } from "@/components/ui/button";

import type { OurFileRouter } from "@/app/api/uploadthing/core";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

export function FileUploader() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    return (
        <div>
            <UploadDropzone<OurFileRouter, any>
                endpoint="imageUploader"
                onClientUploadComplete={(res: any) => {
                    // Do something with the response
                    if (res && res[0] && res[0].fileUrl) {
                        setImageUrl(res[0].fileUrl);
                    }
                    console.log("Files: ", res);
                    alert("Upload Complete");
                }}
                onUploadError={(error: Error) => {
                    // Do something with the error.
                    alert(`ERROR! ${error.message}`);
                }}
            />

            {imageUrl && (
                <div>
                    <img src={imageUrl} alt="Uploaded image" className="max-w-xs mt-4" />
                    <p>Image URL: {imageUrl}</p>
                </div>
            )}
        </div>
    );
}
