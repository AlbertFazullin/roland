import IsomorphicRelay from 'isomorphic-relay';
import IsomorphicRouter from 'isomorphic-relay-router';
import React from 'react';
import ReactDOM from 'react-dom';
import { browserHistory, match, Router } from 'react-router';
import Relay from 'react-relay';
import {
	RelayNetworkLayer, retryMiddleware, urlMiddleware, authMiddleware, loggerMiddleware,
	perfMiddleware, gqErrorsMiddleware
} from 'react-relay-network-layer';
import routes from '../universal/routes';

const environment = new Relay.Environment();

environment.injectNetworkLayer(new RelayNetworkLayer([
	urlMiddleware({
		url: () => '/graphql',
	}),
	loggerMiddleware(),
	gqErrorsMiddleware(),
	perfMiddleware(),
	retryMiddleware({
		fetchTimeout: 15000,
		retryDelays: attempt => Math.pow(2, attempt + 4) * 100, // or simple array [3200, 6400, 12800, 25600, 51200, 102400, 204800, 409600],
		forceRetry: (cb, delay) => { window.forceRelayRetry = cb; console.log(`call forceRelayRetry() for immediately retry! Or wait ${delay} ms.`); },
		statusCodes: [500, 503, 504]
	}),
	authMiddleware({
		token: () => localStorage.getItem('jwt'),
		tokenRefreshPromise: req => {
			console.log('[client.js] resolve token refresh', req);
			return fetch('/jwt/refresh')
				.then(res => res.json())
				.then(json => {
					const token = json.token;
					localStorage.getItem('jwt', token);
					return token;
				})
				.catch(err => console.log('[client.js] ERROR can not refresh token', err));
		},
	}),
], { disableBatchQuery: true }));

const data = JSON.parse(document.getElementById('preloadedData').textContent);

IsomorphicRelay.injectPreparedData(environment, data);

const rootElement = document.getElementById('app');

match({ routes, history: browserHistory }, (error, redirectLocation, renderProps) => {
	IsomorphicRouter.prepareInitialRender(environment, renderProps).then(props => {
		ReactDOM.render(<Router {...props} />, rootElement);
	});
});