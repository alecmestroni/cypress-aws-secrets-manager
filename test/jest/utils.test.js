const utils = require('../../src/utils');
const fs = require('fs');
const path = require('path');

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    promises: {
        access: jest.fn(),
        readFile: jest.fn()
    }
}));

jest.spyOn(global.console, 'log').mockImplementation(() => { });

const localSecret = { key: 'localSecretValue' };
const remoteSecret = { key: 'remoteSecret' };


describe('Utils Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a valid file path with secret as ARN', () => {
        const secretName = 'arn:aws:secretsmanager:region:account-id:secret:mysecret';
        const directory = '/some/directory';

        const filePath = utils.createFilePath(directory, secretName);
        const expectedPath = path.join(directory, 'mysecret.json');

        expect(filePath).toEqual(expectedPath);
    });

    it('should create a valid file path with secret not as ARN', () => {
        const secretName = 'mysecret';
        const directory = '/some/directory';

        const filePath = utils.createFilePath(directory, secretName);
        const expectedPath = path.join(directory, 'mysecret.json');

        expect(filePath).toEqual(expectedPath);
    });

    it('should write secrets to a file', () => {
        const jsonFilePath = '/some/path/secrets.json';

        utils.writeSecretsToFile(jsonFilePath, localSecret);

        expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(jsonFilePath), { recursive: true });
        expect(fs.writeFileSync).toHaveBeenCalledWith(jsonFilePath, JSON.stringify(localSecret, null, 1));
    });

    it('should read local secrets from a file', () => {
        const jsonFilePath = '/some/path/secrets.json';

        fs.readFileSync.mockReturnValue(JSON.stringify(localSecret));

        const result = utils.getLocalSecrets(jsonFilePath);

        expect(result).toEqual(localSecret);
    });

    it('should throw an error if reading JSON file fails', () => {
        const jsonFilePath = '/some/path/secrets.json';
        fs.readFileSync.mockImplementation(() => { throw new Error('File not found'); });

        expect(() => utils.getLocalSecrets(jsonFilePath)).toThrow("⚠️  \x1B[37mError reading JSON file: Error: File not found");
    });


    it('should check for mandatory keys and throw if missing one of them', () => {
        const config = { region: 'us-west-2' };
        const mandatoryKeys = ['secretName', 'region'];

        expect(() => utils.checkOnMandatoryKeys(config, mandatoryKeys)).toThrow('The object MUST contain these mandatory properties: secretName,region');
    });

    it('should check for mandatory keys and throw if missing all of them', () => {
        const config = {};
        const mandatoryKeys = ['secretName', 'region'];

        expect(() => utils.checkOnMandatoryKeys(config, mandatoryKeys)).toThrow('The object MUST contain these mandatory properties: secretName,region');
    });

    it('should merge secrets into the environment', () => {
        const env = { existingKey: 'existingValue' };
        const secrets = { newKey: 'newValue' };

        const merged = utils.updateEnvWithSecrets(env, secrets, 'testSource');

        expect(merged).toEqual({ ...env, ...secrets });
    });

    it('should throw an error if strategy is profile but if profile is missing in AWS_SECRET_MANAGER_CONFIG', async () => {
        const awsSecretsManagerConfig = { secretName: 'mysecret', region: 'us-west-2' };

        await expect(utils.getAwsSecrets('profile', awsSecretsManagerConfig, '/some/dir'))
            .rejects
            .toThrow('Error: Missing \'profile\' key in awsSecretsManagerConfig');
    });
    it('should throw an error if strategy is credentials but if pathToCredentials is missing in AWS_SECRET_MANAGER_CONFIG', async () => {
        const awsSecretsManagerConfig = { secretName: 'mysecret', region: 'us-west-2' };

        await expect(utils.getAwsSecrets('credentials', awsSecretsManagerConfig, '/some/dir'))
            .rejects
            .toThrow('Error: Missing \'pathToCredentials\' key in awsSecretsManagerConfig');
    });
});
