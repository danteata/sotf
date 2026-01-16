"use client"

import type React from "react"

import { useState } from "react"
import { AlertCircle, Check, Download, FileSpreadsheet, Upload, X } from "lucide-react"
import * as XLSX from 'xlsx'
import { format } from "date-fns"

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
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

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
  dob?: string
  birthMonth?: number
  birthDay?: number
  ministries: string[]
  ministryIds: string[]
  isValid: boolean
  errors?: string[]
}

export function BulkUploadDialog({ open, onOpenChange, onSuccess }: BulkUploadDialogProps) {
  const createBulk = useMutation(api.members.createBulk)
  const existingMinistries = useQuery(api.ministries.getAll, { activeOnly: true })

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const validateRecord = (record: any): PreviewData => {
    const errors: string[] = []

    // Helper to find value from multiple possible keys
    const getValue = (keys: string[]): string => {
      for (const key of keys) {
        if (record[key] !== undefined && record[key] !== null) {
          return String(record[key]).trim()
        }
        // Also try lowercase key
        const lowerKey = key.toLowerCase()
        const recordKey = Object.keys(record).find(k => k.toLowerCase() === lowerKey || k.toLowerCase().replace(/_/g, '') === lowerKey.replace(/_/g, ''))
        if (recordKey && record[recordKey] !== undefined && record[recordKey] !== null) {
          return String(record[recordKey]).trim()
        }
      }
      return ""
    }

    // --- EMAIL VALIDATION ---
    const email = getValue(["email", "e-mail", "mail"])
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        errors.push("Invalid email format")
      }
    }

    // --- PHONE VALIDATION ---
    const phone = getValue(["phone", "mobile", "cell", "telephone", "contact"])
    let cleanPhone = ""
    if (phone) {
      cleanPhone = phone.replace(/\D/g, '')
    }

    // --- STATUS VALIDATION ---
    const statusVal = getValue(["status", "active", "member_status"])
    const validStatuses = ["active", "inactive", "visitor"]
    let status = "active" // Default value
    if (statusVal) {
      const providedStatus = statusVal.toLowerCase()
      if (validStatuses.includes(providedStatus)) {
        status = providedStatus
      } else {
        errors.push("Status must be: active, inactive, visitor")
      }
    }

    // --- DOB / BIRTHDAY VALIDATION ---
    // First check for full date of birth
    let dob = getValue(["dob", "date_of_birth", "birth_date", "birthday"])
    let birthMonth: number | undefined
    let birthDay: number | undefined

    // Try to parse DOB if present
    if (dob) {
      // Basic check if it looks like a date, strictly we might want to normalize it
      // For now we accept string as is, or try to format JS date
      const dobDate = new Date(dob)
      if (!isNaN(dobDate.getTime())) {
        dob = format(dobDate, "yyyy-MM-dd")
        birthMonth = dobDate.getMonth() + 1
        birthDay = dobDate.getDate()
      }
    } else {
      // If no full DOB, look for birth month/day
      const monthValue = getValue(["birth_month", "month_of_birth", "birthMonth"])
      const dayValue = getValue(["birth_day", "day_of_the_month", "birthDay"])

      if (monthValue) {
        const monthStr = monthValue.toLowerCase()
        const monthMap: { [key: string]: number } = {
          'january': 1, 'jan': 1, '1': 1, '01': 1,
          'february': 2, 'feb': 2, '2': 2, '02': 2,
          'march': 3, 'mar': 3, '3': 3, '03': 3,
          'april': 4, 'apr': 4, '4': 4, '04': 4,
          'may': 5, '5': 5, '05': 5,
          'june': 6, 'jun': 6, '6': 6, '06': 6,
          'july': 7, 'jul': 7, '7': 7, '07': 7,
          'august': 8, 'aug': 8, '8': 8, '08': 8,
          'september': 9, 'sep': 9, 'sept': 9, '9': 9, '09': 9,
          'october': 10, 'oct': 10, '10': 10,
          'november': 11, 'nov': 11, '11': 11,
          'december': 12, 'dec': 12, '12': 12
        }
        if (monthMap[monthStr]) {
          birthMonth = monthMap[monthStr]
        }
      }

      if (dayValue) {
        const day = parseInt(dayValue)
        if (!isNaN(day) && day >= 1 && day <= 31) {
          birthDay = day
        }
      }
    }

    // --- MINISTRIES VALIDATION ---
    const ministryInput = getValue(["ministries", "ministry", "departments", "department"])
    let ministryNames: string[] = []

    // Handle array from Excel/JSON or split string
    if (record.ministries && Array.isArray(record.ministries)) {
      ministryNames = record.ministries
    } else if (ministryInput) {
      ministryNames = ministryInput.split(/[,;&]/).map(m => m.trim()).filter(m => m.length > 0)
    }

    const ministryIds: string[] = []
    const invalidMinistries: string[] = []

    if (ministryNames.length > 0 && existingMinistries) {
      // Create a map for case-insensitive lookup
      const ministryMap = new Map()
      existingMinistries.forEach(m => ministryMap.set(m.name.toLowerCase(), m.id))

      ministryNames.forEach(name => {
        const id = ministryMap.get(name.toLowerCase())
        if (id) {
          ministryIds.push(id)
        } else {
          invalidMinistries.push(name)
        }
      })
    }

    if (invalidMinistries.length > 0) {
      errors.push(`Ministries not found: ${invalidMinistries.join(", ")}`)
    }

    // --- NAME VALIDATION ---
    const firstName = getValue(["firstName", "first_name", "given_name", "forename"])
    const lastName = getValue(["lastName", "last_name", "surname", "family_name"])

    // --- JOIN DATE ---
    let joinDate = getValue(["joinDate", "joined_date", "date_joined", "start_date"])
    if (!joinDate) {
      // Only default to today if explicitly desired, otherwise maybe leave empty? 
      // Logic asked for: "date of birth just shows today's date" - that was the bug.
      // For Join Date, defaulting to today is arguably acceptable, but let's be careful.
      // Let's set it to today ONLY for join date, passed as string.
      joinDate = format(new Date(), "yyyy-MM-dd")
    } else {
      // Format it if possible
      const jd = new Date(joinDate)
      if (!isNaN(jd.getTime())) {
        joinDate = format(jd, "yyyy-MM-dd")
      }
    }

    if (!firstName) errors.push("First name is required")
    if (!lastName) errors.push("Last name is required")

    return {
      firstName,
      lastName,
      email,
      phone: cleanPhone,
      region: getValue(["region", "area", "zone"]),
      location: getValue(["location", "address", "residence"]),
      status,
      joinDate,
      dob: dob || undefined, // undefined prevents sending "undefined" string
      birthMonth,
      birthDay,
      ministries: ministryNames,
      ministryIds,
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  const processFile = async (file: File) => {
    try {
      if (!existingMinistries) {
        throw new Error("System is initializing. Please wait a moment and try again.")
      }

      setErrorMessage(null)
      setUploadStatus("uploading")

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
    const validRecords = previewData.filter(record => record.isValid)
    const invalidCount = previewData.length - validRecords.length

    if (validRecords.length === 0) {
      setErrorMessage("No valid records found. Please fix the errors in your data file and try again.")
      return
    }

    setUploadStatus("uploading")
    try {
      const membersToInsert = validRecords.map((record, index) => {
        if (!record.firstName || !record.lastName) {
          throw new Error(`Row ${index + 1}: First name and last name are required`)
        }

        const email = record.email
          ? record.email
          : `${record.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${record.lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@placeholder.com`

        return {
          name: `${record.firstName} ${record.lastName}`,
          email: email,
          phone: record.phone || "0000000000",
          status: record.status,
          dob: record.dob, // Now correctly mapped
          birth_month: record.birthMonth,
          birth_day: record.birthDay,
          // Use the validated ministry names/ids
          // The mutation createBulk accepts "ministry_names" which it then looks up again.
          // Since we already validated them, we can pass them. 
          // Note: createBulk implementation in convex/members.ts looks up by name (lowercase).
          ministry_names: record.ministries.length > 0 ? record.ministries : undefined,
          address: record.location || undefined,
          // We don't map joinDate to anything in the createBulk schema currently shown in the analysis?
          // Looking at members.ts createBulk args: name, email, phone, status, dob, birth_month...
          // It does NOT have joinDate. So we can ignore it or map it if we add a field later.
        }
      })

      await createBulk({
        members: membersToInsert as any[]
      })

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
        email: "john.doe@example.com",
        phone: "1234567890",
        dob: "1990-05-15",
        region: "Northern",
        location: "123 Main St",
        status: "active",
        ministries: "Youth Ministry, Choir"
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
                      <p><strong>Required:</strong> firstName, lastName</p>
                      <p><strong>Optional:</strong> email, phone, dob (YYYY-MM-DD), ministries, region, location, status</p>
                      <p><strong>Ministries:</strong> Must match existing ministries exactly (comma separated).</p>
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
                    {invalidRecordsCount} invalid rows will be skipped. Hover over red rows to see errors.
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
                      <TableHead>Status</TableHead>
                      <TableHead>DOB</TableHead>
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
                        <TableCell>{record.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "active" ? "default" : "secondary"}>{record.status}</Badge>
                        </TableCell>
                        <TableCell>{record.dob || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {record.ministries.length > 0 ? (
                              record.ministries.map((min, i) => (
                                <Badge key={i} variant="outline" className={!record.ministryIds[i] ? "text-red-500 border-red-200" : ""}>
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

