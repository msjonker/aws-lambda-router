"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const proxyIntegration = require("./lib/proxyIntegration");
const sns = require("./lib/sns");
const sqs = require("./lib/sqs");
const s3 = require("./lib/s3");
const eventProcessorMapping = new Map();
eventProcessorMapping.set('proxyIntegration', proxyIntegration);
eventProcessorMapping.set('sns', sns);
eventProcessorMapping.set('sqs', sqs);
eventProcessorMapping.set('s3', s3);
const handler = (routeConfig) => {
    return async (event, context) => {
        if (routeConfig.debug) {
            console.log('Lambda invoked with request:', event);
            console.log('Lambda invoked with context:', context);
        }
        for (const [eventProcessorName, eventProcessor] of eventProcessorMapping.entries()) {
            try {
                // the contract of 'processors' is as follows:
                // - their method 'process' is called with (config, event)
                // - the method...
                //   - returns null: the processor does not feel responsible for the event
                //   - throws Error: the 'error.toString()' is taken as the error message of processing the event
                //   - returns object: this is taken as the result of processing the event
                //   - returns promise: when the promise is resolved, this is taken as the result of processing the event
                const result = eventProcessor.process(routeConfig[eventProcessorName], event, context);
                if (result) {
                    // be resilient against a processor returning a value instead of a promise:
                    return await result;
                }
                else {
                    if (routeConfig.debug) {
                        console.log('Event processor couldn\'t handle request.');
                    }
                }
            }
            catch (error) {
                if (error.stack) {
                    console.log(error.stack);
                }
                if (routeConfig.onError) {
                    const result = await routeConfig.onError(error, event, context);
                    if (result) {
                        return result;
                    }
                }
                throw error.toString();
            }
        }
        throw 'No event processor found to handle this kind of event!';
    };
};
exports.handler = handler;
