import { EmitterOptionsArgs } from '@gatewayapps/cradle'

export class FileEmitterOptionsArgs extends EmitterOptionsArgs {
  output!: string
  formatting: 'none' | 'prettier' = 'prettier'
}
