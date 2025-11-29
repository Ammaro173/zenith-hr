"use client";

import { useForm } from "@tanstack/react-form";
import { Upload, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import FieldInfo from "@/components/shared/field-info";
import { Button } from "@/components/ui/button";
import { CountryDropdown } from "@/components/ui/country-dropdown";
import {
  Cropper,
  CropperArea,
  type CropperAreaData,
  CropperImage,
  type CropperPoint,
} from "@/components/ui/cropper";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ErrorResponseSchema } from "@/contracts/common/schema";
import { getErrorMessage } from "@/contracts/common/schema";
import type { Member, SubmitStaffBody } from "@/contracts/member/schema";
import { DEPARTMENTS, QAT_PHONE_PREFIX } from "@/lib/constants";
import { tsr } from "@/lib/react-qeury-utils/tsr";
import { cn } from "@/lib/utils";
import { For, If, tryCatch } from "@/utils";
import { Image as UiImage } from "@/utils/Image";
import { useOnboardingFileUpload } from "./hooks/use-file-upload";
import { type Step, Stepper } from "./Stepper";
import { staffPersonalRequiredSchema } from "./validation";

type StaffFormValues = SubmitStaffBody;

type Props = { id: string; member?: Member };

// biome-ignore lint/style/noMagicNumbers: <base>
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function StaffStepper({ id, member }: Props) {
  const router = useRouter();
  const { mutateAsync: submitStaff, isPending } =
    tsr.members.submit.useMutation();
  const { files, isUploading, setFiles, upload, uploadedUrl, setUploadedUrl } =
    useOnboardingFileUpload();

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [crop, setCrop] = useState<CropperPoint>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<CropperAreaData | null>(
    null
  );
  const [previewSrc, setPreviewSrc] = useState<string>();
  const [pendingFile, setPendingFile] = useState<File>();
  const [isCropping, setIsCropping] = useState(false);

  const hasUploadedImage = Boolean(uploadedUrl);

  const handleCropAreaUpdate = useCallback(
    (_: CropperAreaData, pixels: CropperAreaData) => {
      setCroppedPixels(pixels);
    },
    []
  );

  const defaultValues = useMemo<StaffFormValues>(
    () => ({
      firstName: member?.firstName ?? "",
      lastName: member?.lastName ?? "",
      email: member?.email ?? "",
      phone: member?.phone ?? QAT_PHONE_PREFIX,
      nationality: member?.nationality ?? undefined,
      // qid: member?.qid ?? "",
      department: member?.department ?? undefined,
      imageUrl: member?.imageUrl ?? undefined,
    }),
    [member]
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: staffPersonalRequiredSchema,
    },
    onSubmitInvalid: () => {
      toast.error("Please complete all required fields");
    },
    onSubmit: async ({ value }) => {
      const payload: SubmitStaffBody = {
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim(),
        phone: value.phone,
        nationality: value.nationality,
        // qid: value.qid,
        department: value.department,
        imageUrl: value.imageUrl,
      };

      const { isSuccess, error } = await tryCatch(
        submitStaff({ params: { id }, body: payload })
      );

      if (!isSuccess) {
        toast.error("Submission failed", {
          description: getErrorMessage(error as unknown as ErrorResponseSchema),
        });
        return;
      }
      router.replace(`/invite/${id}/success` as Route);
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: <//TODO>
  useEffect(() => {
    setUploadedUrl(member?.imageUrl ?? undefined);
    if (member?.imageUrl) {
      form.setFieldValue("imageUrl", member.imageUrl);
    }
  }, [member?.imageUrl, setUploadedUrl]);

  const resetCropperState = useCallback(
    (options?: { clearFiles?: boolean }) => {
      const { clearFiles = true } = options ?? {};
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedPixels(null);
      setPreviewSrc(undefined);
      setPendingFile(undefined);
      setCropDialogOpen(false);
      if (clearFiles) {
        setFiles([]);
      }
    },
    [setFiles]
  );

  const readFileAsDataUrl = useCallback(
    (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to read image"));
          }
        });
        reader.addEventListener("error", () => reject(reader.error));
        reader.readAsDataURL(file);
      }),
    []
  );

  const getCroppedBlob = useCallback(
    async (src: string, area: CropperAreaData, mimeType: string) => {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const ImageCtor = globalThis.Image;
        if (!ImageCtor) {
          reject(new Error("Image constructor is not available"));
          return;
        }
        const img = new ImageCtor();
        img.addEventListener("load", () => resolve(img));
        img.addEventListener("error", (event) => {
          reject(new Error(`Failed to load image: ${String(event)}`));
        });
        img.crossOrigin = "anonymous";
        img.src = src;
      });

      const canvas = document.createElement("canvas");
      const width = Math.max(1, Math.round(area.width));
      const height = Math.max(1, Math.round(area.height));
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Unable to create canvas context");
      }

      context.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        width,
        height
      );

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create cropped image"));
            }
          },
          mimeType,
          0.92
        );
      });
    },
    []
  );

  const handleCropConfirm = useCallback(async () => {
    if (!(pendingFile && previewSrc && croppedPixels)) {
      toast.error("Crop is not ready yet");
      return;
    }

    try {
      setIsCropping(true);
      const blob = await getCroppedBlob(
        previewSrc,
        croppedPixels,
        pendingFile.type || "image/jpeg"
      );
      const fileName = pendingFile.name.replace(/(\.[^.]+)?$/, "-cropped$1");
      const croppedFile = new File([blob], fileName, {
        type: blob.type || pendingFile.type,
        lastModified: Date.now(),
      });

      setFiles([croppedFile]);
      const result = await upload(croppedFile);

      if (result?.fileUrl) {
        form.setFieldValue("imageUrl", result.fileUrl);
        setUploadedUrl(result.fileUrl);
      }

      resetCropperState({ clearFiles: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Cropping failed";
      toast.error(message);
      form.setFieldValue("imageUrl", undefined);
      setUploadedUrl(undefined);
      setFiles([]);
    } finally {
      setIsCropping(false);
    }
  }, [
    croppedPixels,
    form,
    getCroppedBlob,
    pendingFile,
    previewSrc,
    setFiles,
    setUploadedUrl,
    upload,
    resetCropperState,
  ]);

  const steps: Step[] = [
    {
      id: "welcome",
      title: "Welcome To Q-Auto Digital Cards",
      subtitle: "Fill in your personal details.",
      label: "Welcome",
      hideContent: true,
      canNext: true,
      render: () => null,
    },
    {
      id: "personal",
      title: "Personal Details",
      subtitle: "Fill in your personal details.",
      label: "Personal",
      render: () => (
        <div className="grid gap-3">
          <form.Field name="firstName">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  First Name
                </Label>
                <Input
                  className="text-primary"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="lastName">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Last Name
                </Label>
                <Input
                  className="text-primary"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Email
                </Label>
                <Input
                  className="text-primary"
                  disabled={!!member?.email}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  type="email"
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="phone">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Phone Number
                </Label>
                <PhoneInput
                  className="text-primary"
                  disabled={!!member?.phone}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(value) => field.handleChange(value)}
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="nationality">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Nationality
                </Label>
                <CountryDropdown
                  defaultValue={field.state.value}
                  onChange={(countryName) => field.handleChange(countryName)}
                  placeholder="Select nationality"
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          {/* <form.Field name="qid">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-primary" htmlFor={field.name}>
                  QID Number
                </Label>
                <Input
                  className="text-primary"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value ?? ""}
                />
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field> */}

          <form.Field name="department">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Department
                </Label>
                <Select
                  onOpenChange={(isOpen) => {
                    if (!isOpen) {
                      field.handleBlur();
                    }
                  }}
                  onValueChange={(nextValue) =>
                    field.handleChange(
                      nextValue as (typeof DEPARTMENTS)[number]
                    )
                  }
                  value={field.state.value}
                >
                  <SelectTrigger className="w-full text-primary">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>

          <form.Field name="imageUrl">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-primary text-sm" htmlFor={field.name}>
                  Upload Profile Image
                </Label>
                <FileUpload
                  accept="image/png,image/jpeg,image/webp"
                  className="w-full"
                  id={field.name}
                  maxFiles={1}
                  maxSize={MAX_FILE_SIZE}
                  multiple={false}
                  //TODO simplify>
                  onAccept={async (acceptedFiles) => {
                    const file = acceptedFiles.at(0);
                    if (!file) {
                      return;
                    }

                    try {
                      const preview = await readFileAsDataUrl(file);
                      setPendingFile(file);
                      setPreviewSrc(preview);
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      setCroppedPixels(null);
                      setCropDialogOpen(true);
                      setFiles([file]);
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Upload failed";
                      toast.error(message);
                      field.handleChange(undefined);
                      setFiles([]);
                      setUploadedUrl(undefined);
                      setPreviewSrc(undefined);
                      setPendingFile(undefined);
                      setCropDialogOpen(false);
                    }
                  }}
                  onFileReject={(file, message) => {
                    toast(message, {
                      description: `"${file.name}" was rejected`,
                    });
                  }}
                  onValueChange={(nextFiles) => {
                    setFiles(nextFiles);
                    if (nextFiles.length === 0) {
                      field.handleChange(undefined);
                      setUploadedUrl(undefined);
                    }
                  }}
                  value={files}
                >
                  <FileUploadDropzone
                    className={cn(
                      "group relative flex min-h-44 flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border border-border/60 border-dashed bg-background/40 p-6 text-center transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      hasUploadedImage &&
                        "bg-background/30 shadow-black/30 shadow-inner"
                    )}
                  >
                    <If isTrue={hasUploadedImage}>
                      <UiImage
                        alt="Current avatar"
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60"
                        fallback="/images/logo.svg"
                        src={uploadedUrl}
                      />
                      {/* <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-background/95 via-background/85 to-background/70 backdrop-blur" /> */}
                    </If>
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <If isTrue={!hasUploadedImage}>
                        <div className="flex size-12 items-center justify-center rounded-full border border-border/60 border-dashed bg-background/80">
                          <Upload className="size-6 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-primary text-sm">
                            Drag & drop file here
                          </p>
                          <p className="text-muted-foreground text-xs">
                            JPEG, PNG or WEBP up to 5MB
                          </p>
                        </div>
                      </If>
                      <If isTrue={hasUploadedImage}>
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-background/80 shadow-sm">
                            <UiImage
                              alt="Current avatar"
                              className="h-full w-full object-cover"
                              fallback="/images/logo.svg"
                              src={uploadedUrl}
                            />
                          </div>
                          <div className="space-y-1 text-primary">
                            <p className="font-semibold text-sm">
                              Profile photo added
                            </p>
                            <p className="text-primary/70 text-xs">
                              Drop another file or browse to replace it
                            </p>
                          </div>
                        </div>
                      </If>
                      <FileUploadTrigger asChild>
                        <Button
                          className="w-fit"
                          size="sm"
                          variant={hasUploadedImage ? "outline" : "secondary"}
                        >
                          {isUploading
                            ? "Uploading..."
                            : hasUploadedImage
                              ? "Replace photo"
                              : "Browse files"}
                        </Button>
                      </FileUploadTrigger>
                    </div>
                  </FileUploadDropzone>
                  <FileUploadList>
                    {files.map((file) => (
                      <FileUploadItem key={file.name} value={file}>
                        <FileUploadItemPreview />
                        <FileUploadItemMetadata className="max-w-52 text-primary" />
                        <FileUploadItemDelete asChild>
                          <Button
                            className="size-7"
                            size="icon"
                            variant="ghost"
                          >
                            <X className="text-primary" />
                          </Button>
                        </FileUploadItemDelete>
                      </FileUploadItem>
                    ))}
                  </FileUploadList>
                </FileUpload>
                <If isTrue={!!uploadedUrl}>
                  <input type="hidden" value={uploadedUrl} />
                </If>
                <If isTrue={!!uploadedUrl}>
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-border/60 p-3 shadow-black/20 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-full border border-white/30 bg-background/80 shadow-sm">
                        <UiImage
                          alt="Uploaded avatar preview"
                          className="h-full w-full object-cover"
                          fallback="/images/logo.svg"
                          src={uploadedUrl}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-medium text-primary text-sm">
                          Using uploaded image
                        </p>
                        <p className="text-muted-foreground text-xs">
                          You can replace it anytime before submitting
                        </p>
                      </div>
                    </div>
                    <Button
                      className="text-primary"
                      onClick={() => {
                        resetCropperState();
                        field.handleChange(undefined);
                        setUploadedUrl(undefined);
                        setFiles([]);
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                </If>
                <FieldInfo field={field} />
              </div>
            )}
          </form.Field>
        </div>
      ),
    },
    {
      id: "review",
      title: "Review & Submit",
      subtitle: "Confirm everything looks correct.",
      label: "Review",
      render: () => (
        <form.Subscribe selector={(s) => s.values}>
          {(values) => {
            const entries = [
              { label: "First name", value: values.firstName },
              { label: "Last name", value: values.lastName },
              { label: "Email", value: values.email },
              { label: "Phone Number", value: values.phone },
              { label: "Nationality", value: values.nationality },
              // { label: "QID", value: values.qid },
              { label: "Department", value: values.department },
            ];

            return (
              <div className="space-y-3 text-muted-foreground text-sm">
                <p>
                  We will submit the provided details to create your staff card.
                </p>
                <div className="grid gap-2">
                  <For
                    each={entries}
                    render={(entry) => (
                      <div
                        className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-card-foreground"
                        key={entry.label}
                      >
                        <span className="font-medium text-foreground">
                          {entry.label}
                        </span>
                        <span>{`${entry.value}`}</span>
                      </div>
                    )}
                  />
                </div>
              </div>
            );
          }}
        </form.Subscribe>
      ),
    },
  ];

  return (
    <>
      <form.Subscribe
        selector={(state) => ({ isSubmitting: state.isSubmitting })}
      >
        {({ isSubmitting }) => (
          <Stepper
            isSubmitting={isPending || isSubmitting}
            logo="/images/logo.svg"
            onSubmit={() => form.handleSubmit()}
            startLabel="Lets Start"
            steps={steps}
          />
        )}
      </form.Subscribe>
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            resetCropperState({ clearFiles: !uploadedUrl });
            if (!uploadedUrl) {
              setUploadedUrl(undefined);
              form.setFieldValue("imageUrl", undefined);
            }
          }
        }}
        open={cropDialogOpen}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Adjust profile image</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
              <Cropper
                allowOverflow={false}
                aspectRatio={1}
                className="h-96"
                crop={crop}
                onCropAreaChange={handleCropAreaUpdate}
                onCropChange={setCrop}
                onCropComplete={handleCropAreaUpdate}
                onZoomChange={setZoom}
                preventScrollZoom
                withGrid
                zoom={zoom}
              >
                {previewSrc ? (
                  <CropperImage
                    alt="Profile image crop preview"
                    crossOrigin="anonymous"
                    src={previewSrc}
                  />
                ) : null}
                <CropperArea shape="rectangle" />
              </Cropper>
            </div>
            <div className="flex items-center gap-3">
              <Label
                className="font-medium text-muted-foreground text-sm"
                htmlFor="cropper-zoom"
              >
                Zoom
              </Label>
              <input
                aria-label="Zoom"
                className="h-1 w-full cursor-pointer appearance-none rounded bg-muted"
                id="cropper-zoom"
                max={3}
                min={1}
                onChange={(event) => setZoom(Number(event.target.value))}
                step={0.01}
                type="range"
                value={zoom}
              />
              <span className="w-12 text-right text-muted-foreground text-xs">
                {zoom.toFixed(2)}x
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              onClick={() => resetCropperState({ clearFiles: !uploadedUrl })}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isCropping}
              onClick={handleCropConfirm}
              type="button"
            >
              {isCropping ? "Processing..." : "Use Cropped Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
