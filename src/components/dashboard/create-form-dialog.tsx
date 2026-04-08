"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createForm } from "@/app/dashboard/[orgId]/forms/actions";

interface CreateFormDialogProps {
  orgId: string;
}

const FORM_TYPES = [
  { value: "waiver", label: "Waiver" },
  { value: "medical", label: "Medical" },
  { value: "permission", label: "Permission" },
  { value: "registration", label: "Registration" },
  { value: "custom", label: "Custom" },
] as const;

export function CreateFormDialog({ orgId }: CreateFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [formType, setFormType] = useState<string>("waiver");
  const [requiresSignature, setRequiresSignature] = useState(true);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    // Append controlled values to formData
    formData.set("formType", formType);
    if (requiresSignature) {
      formData.set("requiresSignature", "on");
    } else {
      formData.delete("requiresSignature");
    }

    const result = await createForm(orgId, formData);

    setPending(false);
    if (result.success) {
      setOpen(false);
      setFormType("waiver");
      setRequiresSignature(true);
    } else {
      setError(result.error ?? "Failed to create form");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" data-icon="inline-start" />
        Create Form
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Form</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">Title</Label>
            <Input
              id="form-title"
              name="title"
              placeholder="e.g. Season Waiver 2026"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-description">Description (optional)</Label>
            <Input
              id="form-description"
              name="description"
              placeholder="Brief description"
            />
          </div>

          <div className="space-y-2">
            <Label>Form Type</Label>
            <Select value={formType} onValueChange={(val) => { if (val) setFormType(val); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-content">Content</Label>
            <Textarea
              id="form-content"
              name="content"
              placeholder="Form content (text, terms, conditions...)"
              rows={6}
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={requiresSignature}
              onCheckedChange={setRequiresSignature}
              id="form-signature"
            />
            <Label htmlFor="form-signature">Requires signature</Label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Form"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
