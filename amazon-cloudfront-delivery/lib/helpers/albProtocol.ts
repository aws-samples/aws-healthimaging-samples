import { AlbDomain } from '../../config.types';

type AlbProtocol = 'http' | 'https';

/**
 * @description Check to see if HTTP mode is enabled in config's ALB_DOMAIN.
 *              Both domainHostname and acmArn must match exactly.
 * @param {AlbDomain} albDomain ALB domain configuration
 * @returns {string}
 */
export function getAlbProtocol(albDomain: AlbDomain): AlbProtocol {
    if (
        albDomain.domainHostname === 'NONE' &&
        albDomain.acmArn === 'I understand encryption in transit is disabled between CloudFront to the ALB'
    ) {
        return 'http';
    }
    return 'https';
}
