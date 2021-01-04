import AWS from 'aws-sdk';
import aws4 from 'aws4';
import request from 'sync-request';
import type { NodePath, TraversalContext } from '@babel/traverse';
import type * as types from '@babel/types';

function parseParameterPath(path: string, prefix: string) {
  const withoutPrefix = path.substring(4);
  const [rawName, rawDecrypt] = withoutPrefix.split('~');
  return { Name: prefix + rawName, WithDecryption: Boolean(rawDecrypt) };
}

function getCredentials() {
  const { credentials, region } = AWS.config;
  const { accessKeyId, secretAccessKey } = credentials ?? new AWS.SharedIniFileCredentials();

  if (!region) {
    throw new Error('Missing AWS_REGION');
  }

  if (!accessKeyId) {
    throw new Error('Missing AWS_ACCESS_KEY_ID');
  }

  if (!secretAccessKey) {
    throw new Error('Missing AWS_SECRET_ACCESS_KEY');
  }

  return { accessKeyId, region, secretAccessKey };
}

function getParameterValue(prefix: string, path: string) {
  const { Name, WithDecryption } = parseParameterPath(path, prefix);
  const { accessKeyId, region, secretAccessKey } = getCredentials();

  const headers = { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AmazonSSM.GetParameter' };
  const { hostname, method, ...opts } = aws4.sign(
    { service: 'ssm', region, body: JSON.stringify({ Name, WithDecryption }), headers },
    { accessKeyId, secretAccessKey }
  );

  const { body } = request(method, `https://${hostname}`, opts);
  const parsedBody = JSON.parse(body.toString());
  return parsedBody?.Parameter?.Value;
}

export default function ({ types: t }: { types: typeof types }) {
  return {
    visitor: {
      ImportDeclaration(path: NodePath<types.ImportDeclaration>, state: TraversalContext) {
        const source = path.node.source.value;

        if (!source.startsWith('ssm:')) {
          return;
        }

        const defaultImport = path.node.specifiers.find((specifier) => {
          return specifier.type === 'ImportDefaultSpecifier';
        });

        if (!defaultImport) {
          throw path.buildCodeFrameError('Import parameters from SSM with default import');
        }

        const value = getParameterValue(state.opts.prefix, source);

        if (!value) {
          throw path.buildCodeFrameError(`Unable to resolve parameter '${source}'`);
        }

        path.replaceWith(
          t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier(defaultImport.local.name), t.stringLiteral(value)),
          ])
        );
      },
    },
  };
}
