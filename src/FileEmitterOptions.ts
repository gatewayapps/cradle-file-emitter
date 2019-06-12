import { EmitterOptionsArgs } from '@gatewayapps/cradle'
import { Options } from 'prettier'

export class FileEmitterOptionsArgs extends EmitterOptionsArgs {
  output!: string
  formatting: 'none' | 'prettier' = 'prettier'
  prettierConfig?: Options
}
