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

interface BulkUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type UploadStatus = "idle" | "uploading" | "validating" | "preview" | "success" | "error"

interface PreviewData {
  firstName: string
  lastName: string
  email: string
  region: string
  location: string
  phone: string
  status: string
  joinDate: string
  birthMonth?: number
  birthDay?: number
  ministries: string[]
  isValid: boolean
  errors?: string[]
}

export function BulkUploadDialog({ open, onOpenChange, onSuccess }: BulkUploadDialogProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const validateRecord = (record: any): PreviewData => {
    const errors: string[] = []

    // Validate email (optional but if present must be valid)
    if (record.email && record.email.toString().trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(record.email.toString().trim())) {
        errors.push("Invalid email format")
      }
    }

    // Validate phone (optional, just check if it contains numbers)
    // Skip validation errors for phone since it's optional
    // The phone field will be cleaned and stored if it has any numbers

    // Validate status (default to "active" if not provided)
    const validStatuses = ["active", "inactive", "visitor"]
    let status = "active" // Default value
    if (record.status && record.status.toString().trim()) {
      const providedStatus = record.status.toString().toLowerCase().trim()
      if (validStatuses.includes(providedStatus)) {
        status = providedStatus
      } else {
        errors.push("Status must be one of: active, inactive, visitor")
      }
    }

    // Validate birth month (optional) - handle "Month of birth" column with month names
    // Skip invalid values instead of throwing errors since this is optional
    let birthMonth: number | undefined
    const monthValue = record["Month of birth"] || record.birthMonth || record.birth_month
    if (monthValue && monthValue.toString().trim()) {
      const monthStr = monthValue.toString().trim()

      // Map month names to numbers
      const monthMap: { [key: string]: number } = {
        'january': 1, 'jan': 1,
        'february': 2, 'feb': 2,
        'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'may': 5,
        'june': 6, 'jun': 6,
        'july': 7, 'jul': 7,
        'august': 8, 'aug': 8,
        'september': 9, 'sep': 9, 'sept': 9,
        'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
      }

      // Try to parse as number first, then as month name
      const numericMonth = parseInt(monthStr)
      if (!isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
        birthMonth = numericMonth
      } else {
        const monthName = monthStr.toLowerCase()
        if (monthMap[monthName]) {
          birthMonth = monthMap[monthName]
        }
        // Skip invalid month values silently since it's optional
      }
    }

    // Validate birth day (optional) - handle "Day of the month" column
    // Skip invalid values instead of throwing errors since this is optional
    let birthDay: number | undefined
    const dayValue = record["Day of the month"] || record.birthDay || record.birth_day
    if (dayValue && dayValue.toString().trim()) {
      const day = parseInt(dayValue.toString())
      if (!isNaN(day) && day >= 1 && day <= 31) {
        birthDay = day
      }
      // Skip invalid day values silently since it's optional
    }

    // Handle ministries field
    let ministries: string[] = []
    try {
      if (Array.isArray(record.ministries)) {
        ministries = record.ministries
      } else if (record.ministries && typeof record.ministries === 'string') {
        ministries = record.ministries.split(",").map((m: string) => m.trim())
      }
    } catch (err) {
      console.warn("Error parsing ministries:", err)
    }

    // Normalize field names - handle both camelCase and snake_case
    const firstName = (record.firstName || record.first_name || "").toString().trim()
    const lastName = (record.lastName || record.last_name || "").toString().trim()
    const joinDate = record.joinDate || record.joined_date || format(new Date(), "yyyy-MM-dd")

    // Validate required fields
    if (!firstName) {
      errors.push("First name is required")
    }
    if (!lastName) {
      errors.push("Last name is required")
    }

    // Clean phone number - extract only digits
    let cleanPhone = ""
    if (record.phone && record.phone.toString().trim()) {
      const phoneDigits = record.phone.toString().replace(/\D/g, '')
      if (phoneDigits.length > 0) {
        cleanPhone = phoneDigits
      }
    }

    return {
      firstName,
      lastName,
      email: record.email || "",
      phone: cleanPhone,
      region: record.region || "",
      location: record.location || record.Location || "",
      status,
      joinDate,
      birthMonth,
      birthDay,
      ministries,
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  const processFile = async (file: File) => {
    try {
      setErrorMessage(null)
      setUploadStatus("uploading")

      // Check file type
      if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
        throw new Error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)")
      }

      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("No sheets found in the file")
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (!jsonData || jsonData.length === 0) {
        throw new Error("No data found in the file. Please check that your file contains data rows.")
      }

      setProgress(50)
      setUploadStatus("validating")

      console.log("Processing", jsonData.length, "records")
      console.log("Sample record:", jsonData[0])

      const validatedData = jsonData.map((record, index) => {
        try {
          return validateRecord(record)
        } catch (validationError: any) {
          console.error(`Error validating record ${index + 1}:`, validationError)
          throw new Error(`Error in row ${index + 2}: ${validationError?.message || 'Validation error'}`)
        }
      })

      setPreviewData(validatedData)
      setProgress(100)
      setUploadStatus("preview")
    } catch (error: any) {
      console.error("File processing error:", error)
      setErrorMessage(error.message || "Failed to process file. Please check the format and try again.")
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
    // Filter out invalid records and only upload valid ones
    const validRecords = previewData.filter(record => record.isValid)
    const invalidCount = previewData.length - validRecords.length

    if (validRecords.length === 0) {
      setErrorMessage("No valid records found. Please fix the errors in your data file and try again.")
      return
    }

    setUploadStatus("uploading")
    try {
      const membersToInsert = validRecords.map((record, index) => {
        // Ensure required fields are present
        if (!record.firstName || !record.lastName) {
          throw new Error(`Row ${index + 1}: First name and last name are required`)
        }

        // Generate email if not provided
        const email = record.email && record.email.trim()
          ? record.email.trim()
          : `${record.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${record.lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@placeholder.com`

        // Clean and validate the data
        const firstName = record.firstName.toString().trim()
        const lastName = record.lastName.toString().trim()

        if (firstName.length === 0 || lastName.length === 0) {
          throw new Error(`Row ${index + 1}: Names cannot be empty after trimming`)
        }

        // Ensure initials are valid
        const firstInitial = firstName.charAt(0).toUpperCase()
        const lastInitial = lastName.charAt(0).toUpperCase()

        if (!firstInitial.match(/[A-Z]/) || !lastInitial.match(/[A-Z]/)) {
          throw new Error(`Row ${index + 1}: Names must start with letters`)
        }

        const memberData = {
          id: uuidv4(),
          name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: record.phone || "0000000000", // Provide default phone if empty
          region: record.region || null,
          address: record.location || null, // Map location to address field
          status: record.status.toLowerCase(),
          joined_date: record.joinDate,
          birth_month: record.birthMonth || null,
          birth_day: record.birthDay || null,
          ministries: record.ministries.length > 0 ? record.ministries : null,
          initials: `${firstInitial}${lastInitial}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Log the member data for debugging
        console.log(`Processing row ${index + 1}:`, memberData)

        return memberData
      })

      console.log("Inserting members:", membersToInsert.length, "records")
      console.log("Sample record:", JSON.stringify(membersToInsert[0], null, 2))

      const { error, data } = await supabase
        .from("members")
        .insert(membersToInsert)
        .select()

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(`Database error: ${error.message}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` (${error.hint})` : ''}`)
      }

      console.log("Successfully inserted:", data?.length, "records")

      // Show success message with upload summary
      if (invalidCount > 0) {
        setErrorMessage(`Upload completed! ${validRecords.length} members uploaded successfully. ${invalidCount} invalid rows were skipped.`)
      } else {
        setErrorMessage(`Upload completed! All ${validRecords.length} members uploaded successfully.`)
      }

      setUploadStatus("success")
      onSuccess?.()
    } catch (error: any) {
      console.error("Upload error:", error)
      setErrorMessage(error.message || "Failed to upload members. Please try again.")
      setUploadStatus("error")
    }
  }

  const handleDownloadTemplate = () => {
    const template = [
      {
        firstName: "John",
        lastName: "Doe",
        email: "", // Optional - will generate placeholder if empty
        phone: "1234567890",
        region: "Northern",
        Location: "123 Main St",
        status: "", // Optional - defaults to "active" if empty
        joinDate: "2024-01-15",
        "Month of birth": "March", // Month name or number (1-12)
        "Day of the month": "15", // Correct column name
        ministries: "Youth Ministry, Music Ministry"
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
                    <div className="space-y-2">
                      <p><strong>Required columns:</strong> firstName, lastName</p>
                      <p><strong>Optional columns:</strong> email, phone, region, Location, joinDate, status, ministries</p>
                      <p><strong>Birth columns:</strong> "Month of birth" (month names like "January" or numbers 1-12), "Day of the month" (1-31)</p>
                      <p><strong>Status values:</strong> active (default), inactive, visitor</p>
                      <p><strong>Ministries:</strong> Separate multiple ministries with commas</p>
                      <p><strong>Note:</strong> Invalid values in optional fields will be skipped. Missing emails will get placeholder addresses.</p>
                    </div>
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

              {invalidRecordsCount > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Invalid Records Found</AlertTitle>
                  <AlertDescription>
                    {invalidRecordsCount} invalid rows will be skipped during upload. Only valid records will be imported.
                  </AlertDescription>
                </Alert>
              )}

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
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Birth Month</TableHead>
                      <TableHead>Birth Day</TableHead>
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
                        <TableCell>{record.location}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "active" ? "default" : "secondary"}>{record.status}</Badge>
                        </TableCell>
                        <TableCell>{record.joinDate}</TableCell>
                        <TableCell>{record.birthMonth || "-"}</TableCell>
                        <TableCell>{record.birthDay || "-"}</TableCell>
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
                <Button onClick={handleConfirmUpload} disabled={validRecordsCount === 0}>
                  Confirm Upload ({validRecordsCount} valid records)
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

