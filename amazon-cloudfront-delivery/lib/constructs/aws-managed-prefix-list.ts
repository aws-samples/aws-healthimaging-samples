import { IPrefixList, PrefixList } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface AwsManagedPrefixListProps {
    /**
     * Name of the aws managed prefix list.
     * See: https://docs.aws.amazon.com/vpc/latest/userguide/working-with-aws-managed-prefix-lists.html#available-aws-managed-prefix-lists
     * eg. com.amazonaws.global.cloudfront.origin-facing
     */
    readonly name: string;
}

export class AwsManagedPrefixList extends Construct {
    public readonly prefixList: IPrefixList;

    constructor(scope: Construct, id: string, { name }: AwsManagedPrefixListProps) {
        super(scope, id);

        const prefixListId = new AwsCustomResource(this, 'GetPrefixListId', {
            installLatestAwsSdk: true,
            onUpdate: {
                service: '@aws-sdk/client-ec2',
                action: 'DescribeManagedPrefixListsCommand',
                parameters: {
                    Filters: [
                        {
                            Name: 'prefix-list-name',
                            Values: [name],
                        },
                    ],
                },
                physicalResourceId: PhysicalResourceId.of(`${id}-${this.node.addr.slice(0, 16)}`),
            },
            policy: AwsCustomResourcePolicy.fromStatements([
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ['ec2:DescribeManagedPrefixLists'],
                    resources: ['*'],
                }),
            ]),
        }).getResponseField('PrefixLists.0.PrefixListId');

        this.prefixList = PrefixList.fromPrefixListId(this, 'PrefixList', prefixListId);
    }
}
