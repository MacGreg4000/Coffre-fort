"use client"

import { useState } from "react"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react"
import { Button } from "@heroui/react"
import { AlertTriangle } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: "default" | "primary" | "secondary" | "success" | "warning" | "danger"
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onOpenChange,
  title = "Confirmation",
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  confirmColor = "danger",
  onConfirm,
  isLoading = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      backdrop="blur"
      classNames={{
        base: "bg-card/80 backdrop-blur-xl border border-border/70 shadow-[var(--shadow-2)] rounded-2xl",
        header: "px-5 pt-5 pb-2",
        body: "px-5 pb-2",
        footer: "px-5 pb-4",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-danger/10">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                </div>
                <span>{title}</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <p className="text-foreground/80 leading-relaxed">{message}</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} isDisabled={isLoading}>
                {cancelLabel}
              </Button>
              <Button
                color={confirmColor}
                onPress={handleConfirm}
                isLoading={isLoading}
              >
                {confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

// Hook pour faciliter l'utilisation
export function useConfirmModal() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  const [config, setConfig] = useState<{
    message: string
    title?: string
    confirmLabel?: string
    cancelLabel?: string
    confirmColor?: "default" | "primary" | "secondary" | "success" | "warning" | "danger"
    onConfirm: () => void | Promise<void>
    isLoading?: boolean
  } | null>(null)

  const confirm = (
    message: string,
    options: {
      title?: string
      confirmLabel?: string
      cancelLabel?: string
      confirmColor?: "default" | "primary" | "secondary" | "success" | "warning" | "danger"
      onConfirm: () => void | Promise<void>
      isLoading?: boolean
    }
  ) => {
    setConfig({
      message,
      title: options.title,
      confirmLabel: options.confirmLabel,
      cancelLabel: options.cancelLabel,
      confirmColor: options.confirmColor,
      onConfirm: options.onConfirm,
      isLoading: options.isLoading,
    })
    onOpen()
  }

  const ConfirmModalComponent = config ? (
    <ConfirmModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={config.title}
      message={config.message}
      confirmLabel={config.confirmLabel}
      cancelLabel={config.cancelLabel}
      confirmColor={config.confirmColor}
      onConfirm={config.onConfirm}
      isLoading={config.isLoading}
    />
  ) : null

  return { confirm, ConfirmModal: ConfirmModalComponent }
}






