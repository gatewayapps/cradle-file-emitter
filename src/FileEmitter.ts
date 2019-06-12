import { CradleEmitterBase, IConsole, CradleSchema, CradleModel } from '@gatewayapps/cradle'
import { FileEmitterOptionsArgs } from './FileEmitterOptions'
import path, { join, isAbsolute, normalize } from 'path'
import { existsSync, writeFileSync, unlinkSync } from 'fs'
import { ensureDirSync } from 'fs-extra'
import { format } from 'prettier'

export type ModelFileContents = {
  model: CradleModel
  contents: string
}

export abstract class FileEmitter extends CradleEmitterBase {
  public options: FileEmitterOptionsArgs
  public outputType: 'singleFile' | 'oneFilePerModel'

  constructor(options: FileEmitterOptionsArgs, _console: IConsole) {
    super(options, _console)
    this.options = options
    this.outputType = this.options.output.toLowerCase().includes('{{name}}')
      ? 'oneFilePerModel'
      : 'singleFile'
  }

  private ModelFileContents: (ModelFileContents)[] = []

  public async emitSchema(schema: CradleSchema) {
    schema.Models.forEach(async (model) => {
      const contents = await this.getContentsForModel(model)
      this.ModelFileContents.push({ model, contents })
    })

    if (this.outputType === 'oneFilePerModel') {
      this.ModelFileContents.forEach(async (modelContents) => {
        this.writeModelContentsToDisk(modelContents)
      })
    } else {
      let overwrite = !!this.options.overwrite || false
      //  Single file, doesn't matter
      const finalPath = this.getFilePathForModel(schema.Models[0])
      if (this.checkExists(finalPath, overwrite)) {
        const finalContents = await this.mergeFileContents(this.ModelFileContents)
        this.writeFileToDisk(finalContents, finalPath)
      }
    }
  }

  private checkExists(filePath: string, overwrite: boolean): boolean {
    if (existsSync(filePath)) {
      if (!overwrite) {
        this.console.warn(`${filePath} already exists. Set overwrite true to overwrite.`)
        return false
      } else {
        unlinkSync(filePath)
      }
    }
    return true
  }

  protected getFilePathForModel(model: CradleModel) {
    const actualOutput =
      this.outputType === 'oneFilePerModel'
        ? this.options.output.replace('{{Name}}', model.Name)
        : this.options.output

    if (isAbsolute(actualOutput)) {
      return actualOutput
    }
    return normalize(join(process.cwd(), actualOutput))
  }

  private writeModelContentsToDisk(modelContents: ModelFileContents) {
    let overwrite = false
    if (this.options.overwrite !== undefined) {
      if (typeof this.options.overwrite === 'boolean') {
        overwrite = this.options.overwrite
      } else {
        if (this.options.overwrite[modelContents.model.Name] !== undefined) {
          overwrite = this.options.overwrite[modelContents.model.Name]
        } else {
          overwrite = this.options.overwrite['_default'] || false
        }
      }
    }

    const pathForModel = this.getFilePathForModel(modelContents.model)
    if (this.checkExists(pathForModel, overwrite)) {
      this.writeFileToDisk(modelContents.contents, pathForModel)
    }
  }

  private writeFileToDisk(contents: string, filePath: string) {
    const parsed = path.parse(filePath)
    if (!parsed.ext) {
      throw new Error(`Output must be to a file.  ${filePath} does not have a file extension`)
    }
    try {
      ensureDirSync(parsed.dir)

      let finalContents = contents
      switch (this.options.formatting) {
        case 'prettier': {
          finalContents = format(contents, this.options.prettierConfig)
          break
        }
      }

      writeFileSync(filePath, contents, 'utf8')
    } catch (err) {
      this.console.warn(`Failed to write ${filePath}`)
    }
  }

  public abstract async getContentsForModel(model: CradleModel): Promise<string>

  public abstract async mergeFileContents(modelFileContents: ModelFileContents[]): Promise<string>
}
