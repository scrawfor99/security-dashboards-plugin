import { httpServerMock } from '../../../../../../src/core/server/http/http_server.mocks';
import { IRouter, OpenSearchDashboardsRequest } from '../../../../../../src/core/server/http/router';
import { SecurityPluginConfigType } from '../../../index';
import { SecuritySessionCookie } from '../../../session/security_cookie';
import { deflateValue } from '../../../utils/compression';
import {
  CoreSetup,
  ILegacyClusterClient,
  Logger,
  SessionStorageFactory,
} from '../../../../../../src/core/server';
import { ProxyAuthentication } from './proxy_auth';

describe('ProxyAuthentication', () => {
  let proxyAuthentication: ProxyAuthentication;
  let router: IRouter;
  let core: CoreSetup;
  let esClient: ILegacyClusterClient;
  let sessionStorageFactory: SessionStorageFactory<SecuritySessionCookie>;
  let logger: Logger;

  beforeEach(() => {
    // Set up mock dependencies
    router = {} as IRouter;
    core = {} as CoreSetup;
    esClient = {} as ILegacyClusterClient;
    sessionStorageFactory = {} as SessionStorageFactory<SecuritySessionCookie>;
    logger = {} as Logger;

    const config = ({
      proxy: {
        extra_storage: {
          cookie_prefix: 'testcookie',
          additional_cookies: 5,
        },
      },
    } as unknown) as SecurityPluginConfigType;

    proxyAuthentication = new ProxyAuthentication(
      config,
      sessionStorageFactory,
      router,
      esClient,
      core,
      logger
    );
  });

  it('should build auth header from cookie with authHeaderValue', () => {

    const cookie: SecuritySessionCookie = {
      credentials: {
        authHeaderValue: 'Bearer eyToken',
      },
    };

    const expectedHeaders = {
      authorization: 'Bearer eyToken',
    };

    const headers = proxyAuthentication.buildAuthHeaderFromCookie(cookie);

    expect(headers).toEqual(expectedHeaders);
  });

  it('should get authHeaderValue from split cookies', () => {
    const testString = 'Bearer eyCombinedToken';
    const testStringBuffer: Buffer = deflateValue(testString);
    const cookieValue = testStringBuffer.toString('base64');
    const cookiePrefix = 'testcookie';
    const splitValueAt = Math.ceil(cookieValue.length / 5);
    const mockRequest = httpServerMock.createRawRequest({
      state: {
        [cookiePrefix + '1']: cookieValue.substring(0, splitValueAt),
        [cookiePrefix + '2']: cookieValue.substring(splitValueAt),
      },
    });
    OpenSearchDashboardsRequest.from(mockRequest);
    const cookie: SecuritySessionCookie = {
      credentials: {
        authHeaderValueExtra: true,
      },
    };

    const expectedHeaders = {
      authorization: testString,
    };

    const headers = proxyAuthentication.buildAuthHeaderFromCookie(cookie);

    expect(headers).toEqual(expectedHeaders);
  });
});
