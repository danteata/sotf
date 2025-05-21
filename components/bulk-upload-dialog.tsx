"use client"

import type React from "react"

import { useState } from "react"
import { AlertCircle, Check, Download, FileSpreadsheet, Upload, X } from "lucide-react"
import * as XLSX from 'xlsx'
import { v4 as uuidv4 } from 'uuid'
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface BulkUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type UploadStatus = "idle" | "uploading" | "validating" | "preview" | "success" | "error"

interface PreviewData {
  firstName: string
  lastName: string
  region: string
  phone: string
  status: string
  joinDate: string
  ministries: string[]
  isValid: boolean
  errors?: string[]
}

export function BulkUploadDialog({ open, onOpenChange, onSuccess }: BulkUploadDialogProps & { onSuccess?: () => void }) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const validateRecord = (record: any): PreviewData => {
    const errors: string[] = []

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(record.email)) {
      errors.push("Invalid email format")
    }

    // Validate phone (simple validation, adjust as needed)
    // const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(record.phone)) {
      errors.push("Invalid phone number format")
    }

    // Validate status
    const validStatuses = ["active", "inactive", "visitor"]
    if (!validStatuses.includes(record.status?.toLowerCase())) {
      errors.push("Invalid status")
    }

    return {
      firstName: record.firstName || "",
      lastName: record.lastName || "",
      phone: record.phone || "",
      region: record.region || "",
      status: record.status || "",
      joinDate: record.joinDate || format(new Date(), "yyyy-MM-dd"),
      ministries: Array.isArray(record.ministries) ? record.ministries : record.ministries?.split(",").map((m: string) => m.trim()) || [],
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  const processFile = async (file: File) => {
    try {
      setUploadStatus("uploading")
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      setProgress(50)
      setUploadStatus("validating")

      const validatedData = jsonData.map(record => validateRecord(record))
      setPreviewData(validatedData)
      setProgress(100)
      setUploadStatus("preview")
    } catch (error) {
      console.error("File processing error:", error)
      setErrorMessage("Failed to process file. Please check the format and try again.")
      setUploadStatus("error")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      processFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setFileName(file.name)
      processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleConfirmUpload = async () => {
    if (previewData.some(record => !record.isValid)) {
      setErrorMessage("Cannot proceed with upload. Please fix the errors in your data file and try again.")
      return
    }

    setUploadStatus("uploading")
    try {
      const membersToInsert = previewData.map(record => ({
        id: uuidv4(),
        name: `${record.firstName} ${record.lastName}`,
        phone: record.phone,
        region: record.region,
        status: record.status.toLowerCase(),
        joined_date: record.joinDate,
        ministries: record.ministries,
        initials: `${record.firstName[0]}${record.lastName[0]}`.toUpperCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from("members")
        .insert(membersToInsert)

      if (error) throw error

      setUploadStatus("success")
      onSuccess?.()
    } catch (error: any) {
      console.error("Upload error:", error)
      setErrorMessage(error.message)
      setUploadStatus("error")
    }
  }

  const handleDownloadTemplate = () => {
    const template = [
      {
        firstName: "",
        lastName: "",
        region: "",
        phone: "",
        status: "",
        joinDate: "",
        ministries: ""
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Members")
    XLSX.writeFile(wb, "members-template.xlsx")
  }

  const handleReset = () => {
    setUploadStatus("idle")
    setProgress(0)
    setFileName(null)
    setPreviewData([])
    setErrorMessage(null)
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const validRecordsCount = previewData.filter((record) => record.isValid).length
  const invalidRecordsCount = previewData.filter((record) => !record.isValid).length

  return (
    <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-transparent z-50 pointer-events-none">

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[calc(100%-2rem)] sm:w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        >
          <DialogHeader>
            <DialogTitle>Bulk Upload Members</DialogTitle>
            <DialogDescription>Upload multiple members at once using a CSV or Excel file.</DialogDescription>
          </DialogHeader>

          {uploadStatus === "idle" && (
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="template">Download Template</TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="space-y-4 pt-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <h3 className="font-medium text-lg">Drag and drop your file here</h3>
                      <p className="text-sm text-muted-foreground">
                        or <span className="text-primary font-medium">browse</span> to upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">Supported formats: CSV, Excel (.xlsx, .xls)</p>
                    </div>
                  </label>
                </div>
              </TabsContent>
              <TabsContent value="template" className="space-y-4 pt-4">
                <div className="border rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <FileSpreadsheet className="h-10 w-10 text-primary" />
                    <div>
                      <h3 className="font-medium text-lg">Download Template</h3>
                      <p className="text-sm text-muted-foreground">
                        Use our template to ensure your data is formatted correctly.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button onClick={handleDownloadTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                  </div>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Template Format</AlertTitle>
                  <AlertDescription>
                    The template includes the following columns: First Name, Last Name, Phone, Region, Status, Join Date,
                    and Ministries. For multiple ministries, separate them with a semicolon (;).
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          )}

          {uploadStatus === "uploading" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{fileName}</p>
                  <Progress value={progress} className="h-2 mt-1" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">Uploading file... {progress}%</p>
            </div>
          )}

          {uploadStatus === "validating" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{fileName}</p>
                  <Progress value={100} className="h-2 mt-1" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">Validating data... Please wait.</p>
            </div>
          )}

          {uploadStatus === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <p className="font-medium">{fileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                    {validRecordsCount} Valid
                  </Badge>
                  {invalidRecordsCount > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                      {invalidRecordsCount} Invalid
                    </Badge>
                  )}
                </div>
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Ministries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((record, index) => (
                      <TableRow key={index} className={!record.isValid ? "bg-red-50" : ""}>
                        <TableCell>
                          {record.isValid ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell>
                          {record.firstName} {record.lastName}
                          {!record.isValid && record.errors && (
                            <div className="text-xs text-red-600 mt-1">
                              {record.errors.map((error, i) => (
                                <div key={i}>{error}</div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{record.phone}</TableCell>
                        <TableCell>{record.region}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "active" ? "default" : "secondary"}>{record.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {record.ministries.length > 0 ? (
                              record.ministries.map((min, i) => (
                                <Badge key={i} variant="outline">
                                  {min}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{record.joinDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {uploadStatus === "success" && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium">Upload Successful</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {validRecordsCount} members have been successfully added to the system.
                </p>
              </div>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Upload Failed</AlertTitle>
                <AlertDescription>
                  There was an error processing your file. Please check the format and try again.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            {uploadStatus === "idle" && (
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            )}

            {(uploadStatus === "uploading" || uploadStatus === "validating") && (
              <Button variant="outline" onClick={handleReset} disabled>
                Cancel
              </Button>
            )}

            {uploadStatus === "preview" && (
              <>
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmUpload} disabled={invalidRecordsCount > 0}>
                  Confirm Upload
                </Button>
              </>
            )}

            {uploadStatus === "success" && <Button onClick={handleClose}>Done</Button>}

            {uploadStatus === "error" && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleReset}>Try Again</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

