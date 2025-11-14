// Простой тест для проверки работоспособности изменений
(async () => {
    console.log('Тестируем исправления OAuth авторизации...');
    
    try {
        // Тестируем получение секретов
        const secrets = await fetchSecretsFromGist();
        console.log('Секреты получены:', secrets);
        
        // Проверяем, что у нас есть и client_id, и client_secret
        if (secrets && secrets.client_id && secrets.client_secret) {
            console.log('✓ Client ID и Client Secret успешно получены');
        } else {
            console.log('✗ Ошибка: отсутствуют необходимые данные');
        }
        
        // Тестируем резервную функцию
        const backupSecrets = fetchEncodedSecretsBackup();
        console.log('Резервные секреты:', backupSecrets);
        
        if (backupSecrets && backupSecrets.client_id && backupSecrets.client_secret) {
            console.log('✓ Резервные Client ID и Client Secret успешно получены');
        } else {
            console.log('✗ Ошибка: резервные данные отсутствуют');
        }
        
        // Тестируем асинхронный вызов createAuthUrl
        const authUrl = await createAuthUrl();
        console.log('✓ Асинхронный вызов createAuthUrl выполнен:', authUrl.includes('client_id='));
        
        console.log('Все тесты пройдены успешно!');
    } catch (error) {
        console.error('Ошибка при тестировании:', error);
    }
})();