# goofh

goofh is a backend server for rendering templates with schema

## usage

### base directory

The default base directory is the same directory of `server.ts` or compiled executable file, use a `--baseDir` flag to specify base directory.

### add schema

Add a `schemas` folder to base directory

Add a `foo.json` to `schemas` directory

```json
{
  "$schema": "http://json-schema.org/draft-04/schema",
  "title": "crud",
  "type": "object",
  "properties": {
    "firstName": { "type": "string" },
    "lastName": { "type": "string" },
    "workExperience": {
      "description": "Work experience in years",
      "type": "integer"
    }
  },
  "required": ["firstName", "lastName"]
}

```

### add templates

Add a `templates` folder to base directory

Add a `test.handlebars` or `test.hbs` file to `templates` directory

```hbs
---
schema: test
---
Hello {{lastName}} {{firstName}}, you have worked for {{workExperience}} years!
```

### start server

Run `vr dev`

## Front matter for hbs file

|Param|Type|Description|Default|
|-|-|-|-|
|name|string|template name|filename of hbs file|
|schema|string|schema name||
|partial|string|if not null, server will register this file as partial that other file can use. The value is partial name||

## API

### GET `/templates`

Get all templates data

Response: `Template[]`

```typescript
type Template = {
  // template name
  name: string
  // schema name
  schema: string
}
```

### GET `/schema/:name`

Get a schema

Response: `Record<string, unknown>`

### POST `/render`

Render a template with data

Requsest: `Param`

```typescript
type Param = {
  // template name
  template: string
  data: Record<string, unknown>
}
```

## todo

- [ ] Helpers

## develop

- deno
- velociraptor

Start dev server with `vr dev` or use deno

```shell
deno run --allow-env --allow-net --allow-read --watch server.ts
```

## compile

- deno

Run `vr build` or use deno

```shell
deno compile --allow-env --allow-net --allow-read server.ts
```
