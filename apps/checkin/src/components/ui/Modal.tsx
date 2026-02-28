import React from 'react'
import { Dialog } from 'trust-ui-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap: Record<string, 'sm' | 'md' | 'lg'> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'lg'
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg'
}: ModalProps): React.ReactElement | null {
  return (
    <Dialog open={isOpen} onClose={onClose} size={sizeMap[maxWidth]}>
      <Dialog.Title onClose={onClose}>{title}</Dialog.Title>
      <Dialog.Content>{children}</Dialog.Content>
    </Dialog>
  )
}

interface ModalActionsProps {
  children: React.ReactNode
}

export function ModalActions({ children }: ModalActionsProps): React.ReactElement {
  return <Dialog.Actions>{children}</Dialog.Actions>
}

export default Modal
