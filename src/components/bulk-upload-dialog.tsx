"use client"

import { useState, useCallback } from "react"
import { AlertCircle, Check, Download, FileSpreadsheet, Upload, X, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useOrganization } from "@/hooks/use-organization"
import { Id } from "../../convex/_generated/dataModel"

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
  rawUnits: { name: string, type: string }[]
  displayUnitNames: string[]
  location: string
  phone: string
  status: string
  joinDate: string
  dob?: string
  birthMonth?: number
  birthDay?: number
  isValid: boolean
  errors?: string[]
}

export function BulkUploadDialog({ open, onOpenChange, onSuccess }: BulkUploadDialogProps) {
  const { organization } = useOrganization()
  const createBulk = useMutation(api.members.createBulk)
  const allUnitsQuery = useQuery(api.units.list, organization?._id ? {} : "skip")
  const allUnits = allUnitsQuery || []

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [targetUnitId, setTargetUnitId] = useState<string>("")

  const validateRecord = useCallback((record: any): PreviewData => {
    const errors: string[] = []

    const getValue = (keys: string[]): string => {
      for (const key of keys) {
        if (record[key] !== undefined && record[key] !== null) {
          return String(record[key]).trim()
        }
        const lowerKey = key.toLowerCase()
        // Robust matching: exact, or ignoring underscores and spaces
        const recordKey = Object.keys(record).find(k => {
          const kLower = k.toLowerCase()
          return kLower === lowerKey ||
            kLower.replace(/_/g, '') === lowerKey.replace(/_/g, '') ||
            kLower.replace(/\s/g, '') === lowerKey.replace(/\s/g, '')
        })
        if (recordKey && record[recordKey] !== undefined && record[recordKey] !== null) {
          return String(record[recordKey]).trim()
        }
      }
      return ""
    }

    // --- EMAIL VALIDATION ---
    let email = getValue(["email", "e-mail", "mail"])

    // --- PHONE VALIDATION ---
    const phone = getValue(["phone", "mobile", "cell", "telephone", "contact"])
    let cleanPhone = ""
    if (phone) {
      cleanPhone = phone.replace(/\D/g, '')
    }

    // --- STATUS VALIDATION ---
    let status = getValue(["status", "member_status", "membership"]).toLowerCase()
    if (!["active", "inactive", "visitor"].includes(status)) {
      status = "active"
    }

    // --- DATE OF BIRTH VALIDATION ---
    const dobValue = getValue(["dob", "date_of_birth", "birthday", "birth_date"])
    let dob = ""
    let birthMonth: number | undefined
    let birthDay: number | undefined

    if (dobValue) {
      const d = new Date(dobValue)
      if (!isNaN(d.getTime())) {
        dob = format(d, "yyyy-MM-dd")
        birthMonth = d.getMonth() + 1
        birthDay = d.getDate()
      } else {
        // Try parsing DD-MM-YYYY or MM-DD-YYYY logic...
        const parts = dobValue.split(/[-/]/)
        if (parts.length === 3) {
          let y, m, day;
          if (parts[0].length === 4) { [y, m, day] = parts }
          else { [day, m, y] = parts }
          const pd = new Date(`${y}-${m}-${day}`)
          if (!isNaN(pd.getTime())) {
            dob = format(pd, "yyyy-MM-dd")
            birthMonth = pd.getMonth() + 1
            birthDay = pd.getDate()
          }
        }
      }
    }

    // If still no birth month/day, check separate columns
    if (!birthMonth || !birthDay) {
      // Extended keys including user provided "Month of birth"
      const monthValue = getValue(["birthMonth", "month", "birth_month", "month of birth", "birth month"])
      const dayValue = getValue(["birthDay", "day", "birth_day", "day of the month", "day of month", "birth day"])

      if (monthValue) {
        const month = parseInt(monthValue)
        if (!isNaN(month) && month >= 1 && month <= 12) {
          birthMonth = month
        } else {
          const monthMap: Record<string, number> = {
            'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
            'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
            'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
            'nov': 11, 'november': 11, 'dec': 12, 'december': 12
          }
          const monthStr = monthValue.toLowerCase().substring(0, 3)
          if (monthMap[monthStr]) birthMonth = monthMap[monthStr]
        }
      }

      if (dayValue) {
        const day = parseInt(dayValue)
        if (!isNaN(day) && day >= 1 && day <= 31) birthDay = day
      }
    }

    // --- NAME VALIDATION ---
    // Extended keys for Full Name support if firstName/lastName not explicit
    let firstName = getValue(["firstName", "first_name", "given_name", "forename"])
    let lastName = getValue(["lastName", "last_name", "surname", "family_name"])

    const fullName = getValue(["full name", "fullname", "name"])
    if ((!firstName || !lastName) && fullName) {
      // Naive split
      const parts = fullName.trim().split(/\s+/)
      if (parts.length > 0) {
        if (!firstName) firstName = parts[0]
        if (!lastName) lastName = parts.slice(1).join(" ")
      }
    }

    const errorsList: string[] = []
    if (!firstName) errorsList.push("First name is required")
    if (!lastName) firstName && (lastName = ".") // If only first name, dot for last name to avoid block? or Error. Choosing to error for now but maybe user wants lenient. User provided "Full name" column example.
    if (!lastName) errorsList.push("Last name is required")

    // --- AUTO-GENERATE EMAIL ---
    if (!email && firstName && lastName && organization?.name) {
      const cleanOrg = organization.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '')
      email = `${cleanFirst}.${cleanLast}@${cleanOrg}.com`
    }


    // --- UNITS VALIDATION (Dynamic) ---
    const rawUnits: { name: string, type: string }[] = []

    // 1. Regions
    const regionInput = getValue(["region", "zone", "area", "territory"])
    if (regionInput) {
      // simple check for multi-value? usually region is single but handle split just in case
      regionInput.split(/[,;&]/).forEach(r => {
        const name = r.trim()
        if (name) rawUnits.push({ name, type: 'geographic' })
      })
    }

    // 2. Ministries
    const ministryInput = getValue(["ministries", "ministry", "department", "group"])
    if (ministryInput) {
      ministryInput.split(/[,;&]/).forEach(m => {
        const name = m.trim()
        if (name) rawUnits.push({ name, type: 'functional' }) // 'functional' for ministries
      })
    }

    // 3. Generic Units
    const genericUnitsInput = getValue(["units", "unit", "groups", "teams"])
    if (genericUnitsInput) {
      genericUnitsInput.split(/[,;&]/).forEach(u => {
        const name = u.trim()
        if (name) rawUnits.push({ name, type: 'functional' })
      })
    }

    // Unique by name
    const uniqueUnits = Array.from(new Map(rawUnits.map(item => [item.name, item])).values());

    return {
      firstName,
      lastName,
      email,
      phone: cleanPhone,
      location: getValue(["location", "address", "residence"]),
      status,
      joinDate: getValue(["joinDate", "join_date", "dateJoined"]),
      dob: dob || undefined,
      birthMonth,
      birthDay,
      rawUnits: uniqueUnits,
      displayUnitNames: uniqueUnits.map(u => u.name),
      isValid: errorsList.length === 0,
      errors: errorsList.length > 0 ? errorsList : undefined
    }
  }, [allUnits, organization])

  const processFile = (file: File) => {
    setFileName(file.name)
    setUploadStatus("uploading")
    setProgress(0)

    const reader = new FileReader()
    reader.onload = (e) => {
      setProgress(50)
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        setUploadStatus("validating")
        setProgress(80)

        const validatedData = jsonData.map((record: any) => validateRecord(record))

        setPreviewData(validatedData)
        setUploadStatus("preview")
        setProgress(100)
      } catch (err: any) {
        console.error("Parse error:", err)
        setErrorMessage("Failed to parse file. Please ensure it is a valid CSV or Excel file.")
        setUploadStatus("error")
      }
    }
    reader.onerror = () => {
      setErrorMessage("Failed to read file.")
      setUploadStatus("error")
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleConfirmUpload = async () => {
    const validRecords = previewData.filter(r => r.isValid)
    const invalidCount = previewData.length - validRecords.length

    if (validRecords.length === 0) {
      setErrorMessage("No valid records found.")
      return
    }

    setUploadStatus("uploading")
    try {
      const membersToInsert = validRecords.map(r => ({
        name: `${r.firstName} ${r.lastName}`,
        email: r.email,
        phone: r.phone || "0000000000",
        status: r.status,
        dob: r.dob,
        birth_month: r.birthMonth,
        birth_day: r.birthDay,
        address: r.location || undefined,
        units: r.rawUnits // Pass dynamic units to backend
      }))

      await createBulk({
        members: membersToInsert,
        target_unit_id: (targetUnitId && targetUnitId !== "org_wide") ? targetUnitId as Id<"units"> : undefined,
        organization_id: organization?._id
      })

      setErrorMessage(`Upload complete: ${validRecords.length} members added. ${invalidCount} skipped.`)
      setUploadStatus("success")
      onSuccess?.()
    } catch (err: any) {
      console.error("Upload error:", err)
      setErrorMessage(err.message || "Failed to upload members.")
      setUploadStatus("error")
    }
  }

  const handleDownloadTemplate = () => {
    const template = [{
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "1234567890",
      dob: "1990-05-15",
      region: "Western Region",
      ministries: "Choir, Ushers",
      location: "123 Main St",
      status: "active",
    }]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Members")
    XLSX.writeFile(wb, "bulk-upload-template.xlsx")
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

  const validCount = previewData.filter(r => r.isValid).length
  const invalidCount = previewData.length - validCount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Members</DialogTitle>
          <DialogDescription>Add multiple members at once using CSV or Excel.</DialogDescription>
        </DialogHeader>

        {uploadStatus === "idle" && (
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="template">Template</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="pt-4 border-2 border-dashed rounded-lg p-12 text-center" onDrop={handleDrop} onDragOver={handleDragOver}>
              <input type="file" id="bulk-upload-file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
              <label htmlFor="bulk-upload-file" className="cursor-pointer flex flex-col items-center">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="font-medium">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports CSV, XLSX, XLS</p>
              </label>
            </TabsContent>
            <TabsContent value="template" className="pt-4 text-center">
              <p className="text-sm text-muted-foreground mb-4">Download the template to see required columns.</p>
              <Button onClick={handleDownloadTemplate} variant="outline">
                <Download className="mr-2 h-4 w-4" /> Download Template
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {(uploadStatus === "uploading" || uploadStatus === "validating") && (
          <div className="py-8 space-y-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">{uploadStatus === "uploading" ? "Uploading..." : "Validating..."}</p>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {uploadStatus === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{fileName}</p>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700">{validCount} Valid</Badge>
                {invalidCount > 0 && <Badge variant="outline" className="bg-red-50 text-red-700">{invalidCount} Invalid</Badge>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Assign to Unit (Optional)</Label>
              <Select value={targetUnitId} onValueChange={setTargetUnitId}>
                <SelectTrigger><SelectValue placeholder="Select a unit" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_wide">Stay Organization-Wide</SelectItem>
                  {allUnits.map(u => (
                    <SelectItem key={u._id} value={u._id}>{u.name} ({u.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Note: Regions and Ministries found in the file will be created automatically.
              </p>
            </div>

            <div className="border rounded-md max-h-[300px] overflow-auto text-xs">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Units (New & Existing)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.slice(0, 50).map((r, i) => (
                    <TableRow key={i} className={r.isValid ? "" : "bg-red-50"}>
                      <TableCell>{r.isValid ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}</TableCell>
                      <TableCell>{r.firstName} {r.lastName}</TableCell>
                      <TableCell>{r.email || "-"}</TableCell>
                      <TableCell>{r.displayUnitNames.join(", ") || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {previewData.length > 50 && <p className="p-2 text-center text-muted-foreground italic">Showing first 50 rows only</p>}
            </div>
          </div>
        )}

        {uploadStatus === "success" && (
          <div className="py-8 text-center space-y-2">
            <Check className="h-12 w-12 text-green-600 mx-auto" />
            <h3 className="text-lg font-bold">Success!</h3>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>
        )}

        {uploadStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          {uploadStatus === "idle" && <Button variant="ghost" onClick={handleClose}>Cancel</Button>}
          {uploadStatus === "preview" && (
            <>
              <Button variant="ghost" onClick={handleReset}>Reset</Button>
              <Button onClick={handleConfirmUpload} disabled={validCount === 0}>Upload {validCount} Records</Button>
            </>
          )}
          {uploadStatus === "success" && <Button onClick={handleClose}>Done</Button>}
          {uploadStatus === "error" && <Button onClick={handleReset}>Try Again</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
