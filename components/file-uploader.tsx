"use client";

import { useState, useRef, useCallback } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import type { OurFileRouter } from "@/app/api/uploadthing/core";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

interface FileUploaderProps {
    onUploadComplete?: (url: string) => void;
    showPreview?: boolean;
}

export function FileUploader({ onUploadComplete, showPreview = false }: FileUploaderProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const { startUpload } = useUploadThing("imageUploader", {
        onClientUploadComplete: (res) => {
            console.log("Upload completed:", res);
            setIsUploading(false);
            if (res && res[0] && res[0].url) {
                const url = res[0].url;
                console.log("Image URL:", url);
                setImageUrl(url);

                if (onUploadComplete) {
                    onUploadComplete(url);
                }

                toast({
                    title: "Upload Complete",
                    description: "Image uploaded successfully",
                });
            } else {
                console.error("Invalid response format:", res);
                toast({
                    title: "Upload Error",
                    description: "Invalid response from server",
                    variant: "destructive",
                });
            }
        },
        onUploadError: (error) => {
            console.error("Upload error:", error);
            setIsUploading(false);
            toast({
                title: "Upload Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: "Invalid File",
                description: "Please select an image file",
                variant: "destructive",
            });
            return;
        }

        // Validate file size (4MB limit)
        if (file.size > 4 * 1024 * 1024) {
            toast({
                title: "File Too Large",
                description: "Please select an image smaller than 4MB",
                variant: "destructive",
            });
            return;
        }

        console.log("Starting upload for:", file.name);
        setIsUploading(true);
        await startUpload([file]);
    }, [startUpload, toast]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files);
    }, [handleFileSelect]);

    return (
        <div className="w-full space-y-4">
            {/* Upload Area */}
            <div
                className={`
                    relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                    ${isDragOver
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-300 hover:border-gray-400'
                    }
                    ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                />

                <div className="flex flex-col items-center space-y-4">
                    {isUploading ? (
                        <>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <p className="text-sm text-gray-600">Uploading...</p>
                        </>
                    ) : (
                        <>
                            <Upload className={`h-8 w-8 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                            <div>
                                <p className="text-sm font-medium text-gray-700">
                                    {isDragOver ? 'Drop your image here' : 'Click to upload or drag and drop'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    PNG, JPG, GIF up to 4MB
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Preview */}
            {imageUrl && (
                <div className="relative inline-block">
                    <img
                        src={imageUrl}
                        alt="Uploaded image"
                        className="max-w-xs rounded-lg border shadow-sm"
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                        onClick={() => {
                            setImageUrl(null);
                            if (onUploadComplete) {
                                onUploadComplete("");
                            }
                        }}
                    >
                        <X className="w-3 h-3" />
                    </Button>
                </div>
            )}

            {/* Additional Preview for showPreview prop */}
            {showPreview && imageUrl && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Upload Preview</h4>
                    <img src={imageUrl} alt="Uploaded image" className="max-w-xs rounded-lg border" />
                    <p className="text-sm text-muted-foreground mt-2">Image URL: {imageUrl}</p>
                </div>
            )}
        </div>
    );
}
