# `@grabvintage/babel-plugin-transform-ssm`

This Babel plugin looks for imports in your code with `ssm:` prefix and replaces them with actual parameter values from AWS Systems Manager.

### Installation.

```shell
$ npm i @grabvintage/babel-plugin-transform-ssm
```

```shell
$ yarn add @grabvintage/babel-plugin-transform-ssm
```

### Configuration.

The only configurable parameter is `prefix` — a part of the parameter path that's appended to every requested parameter. For example, if you request a parameter `ssm:/test` with prefix `/app`, the plugin will be looking for `/app/test` parameter.

AWS credentials are configured via CLI. Please make sure that `AWS_PROFILE` (or `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`) and `AWS_REGION` environment variables are set.

#### Sample configuration.

`babel.config.js`

```js
module.exports = {
  plugins: [['@grabvintage/babel-plugin-transform-ssm', { prefix: `/grabvintage/${process.env.ENV || 'default'}` }]],
};
```

### Usage.

Currently only `import`s are supported. Open an issue if you need support for any other syntax.

`before`

```ts
import databaseName from 'ssm:/database/name';
```

`after`

```ts
const databaseName = 'grabvintage-default';
```

#### Usage with TypeScript.

TypeScript will be complaining about missing modules on every import that starts with `ssm:` prefix. To mitigate this, add a definition file somewhere in your project with the following content:

`ssm.d.ts`

```ts
declare module 'ssm:/database/name' {
  const parameter: string | undefined;
  export = parameter;
}
```
