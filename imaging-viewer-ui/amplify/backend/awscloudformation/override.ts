import { AmplifyRootStackTemplate } from '@aws-amplify/cli-extensibility-helper';

/**
 * Override Amplify-generated project-level IAM roles
 * https://docs.amplify.aws/cli/project/override/
 * Give the authenticated role permissions to medical-imaging
 */
export function override(resources: AmplifyRootStackTemplate) {
    const authRole = resources.authRole;

    const basePolicies = Array.isArray(authRole.policies) ? authRole.policies : [authRole.policies];
    authRole.policies = [
        ...basePolicies,
        {
            policyName: 'medical-imaging',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Resource: '*',
                        Action: [
                            'medical-imaging:GetDatastore',
                            'medical-imaging:ListDatastores',
                            'medical-imaging:GetDICOMImportJob',
                            'medical-imaging:ListDICOMImportJobs',
                            'medical-imaging:ListTagsForResource',
                            'medical-imaging:GetImageSet',
                            'medical-imaging:ListImageSetVersions',
                            'medical-imaging:GetImageSetMetadata',
                            'medical-imaging:GetImageFrame',
                            'medical-imaging:SearchImageSets',
                            'medical-imaging:UpdateImageSetMetadata',
                        ],
                        Effect: 'Allow',
                    },
                ],
            },
        },
    ];
}
