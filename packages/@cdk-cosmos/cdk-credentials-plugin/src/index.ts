import { Plugin, PluginHost, CredentialProviderSource } from 'aws-cdk';
import { Credentials, ChainableTemporaryCredentials } from 'aws-sdk';

// Init AWS-SDK with common settings like proxy
// new SDK();

export class CdkCredentialsProvider implements CredentialProviderSource {
  readonly name = 'cdk-credentials-plugin';
  readonly cache: { [key: string]: ChainableTemporaryCredentials | undefined } = {};

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async canProvideCredentials(accountId: string): Promise<boolean> {
    try {
      if (!this.cache[accountId]?.expired) {
        const roleName = 'CoreCdkCrossAccountRole';
        const cred = new ChainableTemporaryCredentials({
          params: {
            RoleArn: `arn:aws:iam::${accountId}:role/${roleName}`,
            RoleSessionName: 'cdk-credentials-provider',
          },
        });
        await cred.getPromise();
        this.cache[accountId] = cred;
      }
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  }

  async getProvider(accountId: string): Promise<Credentials> {
    const creds = this.cache[accountId];
    if (!creds) throw new Error('Credentials Not Found.');
    return creds;
  }
}

export class CdkCredentialsPlugin implements Plugin {
  public readonly version = '1';

  public init(host: PluginHost): void {
    host.registerCredentialProviderSource(new CdkCredentialsProvider());
  }
}

module.exports = new CdkCredentialsPlugin();
