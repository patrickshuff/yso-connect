"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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
import { updateForm } from "@/app/dashboard/[orgId]/forms/actions";

interface EditFormDialogProps {
  orgId: string;
  form: {
    id: string;
    title: string;
    description: string | null;
    formType: string;
    content: string;
    requiresSignature: boolean;
  };
}

const FORM_TYPES = [
  { value: "waiver", label: "Waiver" },
  { value: "medical", label: "Medical" },
  { value: "permission", label: "Permission" },
  { value: "registration", label: "Registration" },
  { value: "custom", label: "Custom" },
] as const;

export function EditFormDialog({ orgId, form }: EditFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [formType, setFormType] = useState<string>(form.formType);
  const [requiresSignature, setRequiresSignature] = useState(form.requiresSignature);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    formData.set("formType", formType);
    if (requiresSignature) {
      formData.set("requiresSignature", "on");
    } else {
      formData.delete("requiresSignature");
    }

    const result = await updateForm(orgId, form.id, formData);

    setPending(false);
    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error ?? "Failed to update form");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      // Reset to current form values when opening
      setFormType(form.formType);
      setRequiresSignature(form.requiresSignature);
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Pencil className="size-4" />
        <span className="sr-only">Edit form</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Form</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-form-title">Title</Label>
            <Input
              id="edit-form-title"
              name="title"
              defaultValue={form.title}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-form-description">Description (optional)</Label>
            <Input
              id="edit-form-description"
              name="description"
              defaultValue={form.description ?? ""}
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
            <Label htmlFor="edit-form-content">Content</Label>
            <Textarea
              id="edit-form-content"
              name="content"
              defaultValue={form.content}
              rows={6}
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={requiresSignature}
              onCheckedChange={setRequiresSignature}
              id="edit-form-signature"
            />
            <Label htmlFor="edit-form-signature">Requires signature</Label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
