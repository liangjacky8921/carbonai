import { ElMessageBox } from 'element-plus'

export function useConfirmAction() {
  async function confirmAction(
    message: string,
    title = '确认操作',
    confirmButtonText = '确认',
  ): Promise<boolean> {
    try {
      await ElMessageBox.confirm(message, title, {
        confirmButtonText,
        cancelButtonText: '取消',
        type: 'warning',
        closeOnClickModal: false,
        autofocus: true,
      })
      return true
    } catch {
      return false
    }
  }

  return { confirmAction }
}
