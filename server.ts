import Handlebars, {
  HandlebarsTemplateDelegate,
} from 'https://esm.sh/handlebars'
import matter from 'https://esm.sh/gray-matter@4.0.3'
import { Application, Router } from 'https://deno.land/x/oak@v10.6.0/mod.ts'
import { oakCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts'
import { walk } from 'https://deno.land/std@0.141.0/fs/mod.ts'
import {
  globToRegExp,
  parse,
  join,
  resolve,
} from 'https://deno.land/std@0.141.0/path/mod.ts'
import * as log from 'https://deno.land/std@0.141.0/log/mod.ts'
import { parse as parseFlag } from 'https://deno.land/std@0.142.0/flags/mod.ts'

const port = 3456

const router = new Router()

interface Template {
  name: string
  schema: string
  hbs: HandlebarsTemplateDelegate
}

const templates: Template[] = []

interface Schema {
  name: string
  content: Record<string, unknown>
}

const schemas: Schema[] = []

const baseDir = resolve(parseFlag(Deno.args)['baseDir'] || '.')

log.info('Basedir ' + baseDir)

log.info('Loading schemas')

for await (const w of walk(join(baseDir, 'schemas'), {
  match: [globToRegExp('**/*' + '.json')],
})) {
  if (w.isFile) {
    const content = await Deno.readFile(w.path)
    const contentText = new TextDecoder().decode(content)

    const fileName = parse(w.name).name

    try {
      schemas.push({ name: fileName, content: JSON.parse(contentText) })
    } catch {
      log.error(`Error parsing ${w.name}`)
      Deno.exit(1)
    }
  }
}

log.info('Loading templates')

for await (const w of walk(join(baseDir, 'templates'), {
  match: [globToRegExp('**/*.{handlebars,hbs}')],
})) {
  if (w.isFile) {
    const content = await Deno.readFile(w.path)
    const fileName = parse(w.name).name

    const contentText = new TextDecoder().decode(content)
    const converted = matter(contentText)

    const templateName = converted.data.name ?? fileName
    const schemaName = converted.data.schema

    if (converted.data.partial) {
      Handlebars.registerPartial(converted.data.partial, converted.content)
    }

    if (!schemaName) {
      log.error(`File ${w.name} does not have a schema`)
      Deno.exit(1)
    } else if (!schemas.map((s) => s.name).includes(schemaName)) {
      log.error(`File ${w.name}'s schema ${schemaName} not found`)
      Deno.exit(1)
    }

    templates.push({
      name: templateName,
      schema: schemaName,
      hbs: Handlebars.compile(converted.content),
    })
  }
}

interface Param {
  template: string
  data: unknown
}

router
  .get('/schema/:name', (context) => {
    const name = context?.params?.name
    const schema = schemas.findLast((s) => s.name === name)
    if (schema) {
      context.response.body = schema.content
      context.response.headers.set(
        'Content-Type',
        'application/json; charset=utf-8'
      )
    } else {
      context.response.status = 404
    }
  })
  .get('/templates', (context) => {
    context.response.body = JSON.stringify(
      templates.map((t) => ({ name: t.name, schema: t.schema }))
    )
    context.response.headers.set(
      'Content-Type',
      'application/json; charset=utf-8'
    )
  })
  .post('/render', async (context) => {
    const val = (await context.request.body({ type: 'json' }).value) as Param
    const template = templates.findLast((t) => t.name === val.template)
    if (template) {
      context.response.body = template.hbs(val.data) as string
      context.response.headers.set('Content-Type', 'text/plain; charset=utf-8')
    } else {
      context.response.status = 404
    }
  })

const app = new Application()
app.use(oakCors())
app.use(router.routes())

log.info(`Listening on port ${port}`)

await app.listen({ port })
