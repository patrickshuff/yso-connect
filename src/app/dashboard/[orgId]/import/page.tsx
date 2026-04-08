"use client";

import { useCallback, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseCsvRoster, type ParseResult } from "@/lib/csv-import";
import { importCsvRoster, type ImportResult } from "./actions";

type ImportState = "idle" | "preview" | "importing" | "done";

export default function ImportPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>("idle");
  const [csvText, setCsvText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;
      setCsvText(text);
      const result = parseCsvRoster(text);
      setParseResult(result);
      setState("preview");
      setImportResult(null);
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleImport = useCallback(async () => {
    setState("importing");
    const result = await importCsvRoster(orgId, csvText);
    setImportResult(result);
    setState("done");
  }, [orgId, csvText]);

  const handleReset = useCallback(() => {
    setState("idle");
    setCsvText("");
    setParseResult(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Import Roster
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Upload a CSV file to import players and guardians.
      </p>

      {/* Upload area */}
      {state === "idle" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>
              Drag and drop a CSV file or click to browse. Expected columns:
              player_first_name, player_last_name, player_dob,
              guardian1_first_name, guardian1_last_name, guardian1_email,
              guardian1_phone, guardian1_relationship (and optionally guardian2_*).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                dragOver
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                  : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Drop your CSV file here, or click to select
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {state === "preview" && parseResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Review the parsed data before importing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parseResult.errors.length > 0 && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <p className="mb-2 text-sm font-medium text-red-800 dark:text-red-200">
                  {parseResult.errors.length} row(s) with errors (will be skipped):
                </p>
                <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                  {parseResult.errors.map((err, i) => (
                    <li key={i}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parseResult.rows.length === 0 ? (
              <p className="text-sm text-zinc-500">No valid rows to import.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-zinc-500 dark:text-zinc-400">
                      <th className="pb-2 pr-4 font-medium">Player</th>
                      <th className="pb-2 pr-4 font-medium">DOB</th>
                      <th className="pb-2 pr-4 font-medium">Guardian 1</th>
                      <th className="pb-2 font-medium">Guardian 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="py-2 pr-4 text-zinc-900 dark:text-zinc-50">
                          {row.playerFirstName} {row.playerLastName}
                        </td>
                        <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">
                          {row.playerDob ?? "-"}
                        </td>
                        <td className="py-2 pr-4">
                          {row.guardians[0] && (
                            <div>
                              <span className="text-zinc-900 dark:text-zinc-50">
                                {row.guardians[0].firstName}{" "}
                                {row.guardians[0].lastName}
                              </span>
                              <Badge variant="secondary" className="ml-2">
                                {row.guardians[0].relationship}
                              </Badge>
                              {row.guardians[0].email && (
                                <div className="text-xs text-zinc-500">
                                  {row.guardians[0].email}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2">
                          {row.guardians[1] ? (
                            <div>
                              <span className="text-zinc-900 dark:text-zinc-50">
                                {row.guardians[1].firstName}{" "}
                                {row.guardians[1].lastName}
                              </span>
                              <Badge variant="secondary" className="ml-2">
                                {row.guardians[1].relationship}
                              </Badge>
                              {row.guardians[1].email && (
                                <div className="text-xs text-zinc-500">
                                  {row.guardians[1].email}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <Button onClick={handleImport} disabled={parseResult.rows.length === 0}>
                Import {parseResult.rows.length} player(s)
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Importing */}
      {state === "importing" && (
        <Card className="mt-6">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-zinc-500">Importing roster data...</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {state === "done" && importResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">{importResult.importedCount}</Badge>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  imported
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{importResult.skippedCount}</Badge>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  skipped
                </span>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <p className="mb-2 text-sm font-medium text-red-800 dark:text-red-200">
                  Errors:
                </p>
                <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>
                      {err.row > 0 ? `Row ${err.row}: ` : ""}
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <Button onClick={handleReset}>Import Another</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
