"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2, ShieldCheck, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface FileUploaderProps {
    onUploadComplete?: (storageId: string, previewUrl?: string) => void;
    showPreview?: boolean;
}

export function FileUploader({ onUploadComplete, showPreview = false }: FileUploaderProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Convex Mutations
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: "INVALID_FORMAT",
                description: "MISSION_ERROR: IMAGE_FILE_REQUIRED",
                variant: "destructive",
            });
            return;
        }

        // Validate file size (4MB limit)
        if (file.size > 4 * 1024 * 1024) {
            toast({
                title: "PAYLOAD_TOO_LARGE",
                description: "MISSION_ERROR: 4MB_CEILING_EXCEEDED",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);
        try {
            // 1. Get a short-lived upload URL from Convex
            const postUrl = await generateUploadUrl();

            // 2. POST the file to the URL
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) {
                throw new Error("TRANSMISSION_FAILURE");
            }

            const { storageId } = await result.json();

            // 3. Get the public URL for the storageId
            // We can't use useQuery here, but we can call a function or just construct it if we know the pattern
            // Actually, best to have a mutation or a way to get it. 
            // For now, let's assume we want to store the storageId in the future, 
            // but for immediate display we can fetch the URL.

            // Temporary measure: constructive approach if possible, but Convex URLs are signed or specific.
            // Let's use a workaround: we'll call a server function to get the URL.
            // Actually, I'll just refactor convex/files.ts to have a mutation for this if needed, 
            // or better, just provide a helper.

            // Constructive way (internal convex):
            // const publicUrl = await ctx.storage.getUrl(storageId);

            // I'll add a mutation to files.ts just for this purpose of getting the URL immediately.
            // Wait, I can't call mutations to get data easily without it being a query.

            // I'll just pass the storageId for now if possible, but the component expects URL.
            // Let's assume the storageId IS the URL for now or we fetch it.

            toast({
                title: "ENCRYPTED_UPLOAD_COMPLETE",
                description: "PAYLOAD_SECURED_IN_CONVEX_STORAGE",
            });

            // Since I need the URL string, I'll use a hacky way or just update files.ts
            // Actually, I'll update the component to just use the storageId as the payload 
            // and have a separate display logic.

            // FOR NOW: I'll return the storageId as the "url" and update the display.
            const url = storageId;
            setImageUrl(url); // This won't show anything unless we resolve it.

            // FOR NOW: I'll return the storageId as the "url" and update the display.
            const previewUrl = URL.createObjectURL(file);
            setImageUrl(previewUrl);

            if (onUploadComplete) {
                onUploadComplete(storageId, previewUrl);
            }

        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                title: "TRANSMISSION_FAILED",
                description: error.message || "UPLINK_INTERRUPTED",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    }, [generateUploadUrl, onUploadComplete, toast]);

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
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-xs tracking-tight text-slate-700">File Upload</span>
                </div>
                <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                    {/* <span className="font-medium text-[10px] text-muted-foreground">Cloud Secured</span> */}
                </div>
            </div>

            {/* Upload Area */}
            <div
                className={`
                    relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
                    ${isDragOver
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
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
                            <Loader2 className="h-10 w-10 animate-spin text-primary stroke-[2px]" />
                            <div className="space-y-1">
                                <p className="text-base text-slate-900">Uploading File...</p>
                                <p className="text-xs text-muted-foreground">Connecting to storage...</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-3 bg-slate-100 rounded-full group-hover:bg-primary/10 transition-colors">
                                <Upload className={`h-8 w-8 ${isDragOver ? 'text-primary' : 'text-slate-500'} stroke-[2px]`} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg text-slate-900 tracking-tight">
                                    {isDragOver ? 'Drop file here' : 'Click to upload'}
                                </p>
                                <p className="text-sm text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                                    or drag and drop a JPG or PNG (max 4MB)
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Preview Area */}
            {imageUrl && (
                <div className="p-4 border border-border/50 bg-slate-50/50 rounded-xl relative shadow-sm animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2 mb-3">
                        <ImageIcon className="h-4 w-4 text-slate-500" />
                        <span className="font-semibold text-xs text-slate-700">File Preview</span>
                    </div>
                    <div className="relative inline-block border border-dashed border-border rounded-lg overflow-hidden bg-white/50">
                        <div className="w-full h-32 flex flex-col items-center justify-center p-6 text-center gap-2">
                            <ShieldCheck className="h-8 w-8 text-emerald-500" />
                            <p className="text-[10px] text-slate-500">File secured successfully</p>
                            <p className="text-[9px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">ID: {imageUrl.substring(0, 16)}...</p>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 rounded-full h-7 w-7 p-0 hover:bg-red-50 hover:text-red-500 transition-colors"
                            onClick={() => {
                                setImageUrl(null);
                                if (onUploadComplete) {
                                    onUploadComplete("");
                                }
                            }}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
