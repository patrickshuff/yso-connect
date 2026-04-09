"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { submitForm } from "@/app/dashboard/[orgId]/forms/actions";

interface FormSubmitFormProps {
  orgId: string;
  formId: string;
  formTitle: string;
  formContent: string;
  requiresSignature: boolean;
  guardianId: string;
  guardianName: string;
  assignments: { id: string; assignmentType: string; assignmentTargetId: string | null; targetName: string }[];
  playerOptions: { id: string; name: string }[];
}

export function FormSubmitForm({
  orgId,
  formId,
  formTitle,
  formContent,
  requiresSignature,
  guardianId,
  guardianName,
  assignments,
  playerOptions,
}: FormSubmitFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(
    assignments.length === 1 ? assignments[0].id : "",
  );
  const [selectedPlayer, setSelectedPlayer] = useState(
    playerOptions.length === 1 ? playerOptions[0].id : "",
  );
  const [acknowledged, setAcknowledged] = useState(false);

  if (submitted) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-12">
            <CheckCircle className="size-12 text-green-600" />
            <h3 className="text-lg font-semibold">Form Submitted</h3>
            <p className="text-sm text-muted-foreground">
              Thank you for completing &quot;{formTitle}&quot;. Your submission has been recorded.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-12">
            <p className="text-sm text-muted-foreground">
              No pending assignments found for this form. You may have already completed all required submissions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    formData.set("assignmentId", selectedAssignment);
    formData.set("guardianId", guardianId);
    formData.set("playerId", selectedPlayer);
    if (acknowledged) {
      formData.set("acknowledged", "on");
    }
    formData.set("ipAddress", ""); // will be empty from client, could be enhanced server-side
    formData.set("userAgent", navigator.userAgent);

    const result = await submitForm(orgId, formId, formData);

    setPending(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error ?? "Failed to submit form");
    }
  }

  return (
    <div className="space-y-6">
      {/* Form content */}
      <Card>
        <CardHeader>
          <CardTitle>{formTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {formContent}
          </div>
        </CardContent>
      </Card>

      {/* Submission form */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Submitting as: <strong>{guardianName}</strong>
            </p>

            {assignments.length > 1 && (
              <div className="space-y-2">
                <Label>Assignment</Label>
                <Select value={selectedAssignment} onValueChange={(val) => { if (val) setSelectedAssignment(val); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.targetName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {playerOptions.length > 1 && (
              <div className="space-y-2">
                <Label>For Player</Label>
                <Select value={selectedPlayer} onValueChange={(val) => { if (val) setSelectedPlayer(val); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {playerOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {requiresSignature && (
              <div className="space-y-2">
                <Label htmlFor="signature-name">
                  Typed Signature (full legal name)
                </Label>
                <Input
                  id="signature-name"
                  name="signatureName"
                  placeholder="Type your full legal name"
                  className="font-serif italic"
                  required
                />
              </div>
            )}

            <div className="flex items-start gap-3">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                id="acknowledge"
              />
              <Label htmlFor="acknowledge" className="text-sm leading-relaxed">
                I acknowledge that I have read and understand the contents of this form, and I agree to its terms.
              </Label>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={pending || !acknowledged || !selectedAssignment || !selectedPlayer}
            >
              {pending ? "Submitting..." : "Submit Form"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
