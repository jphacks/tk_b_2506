import { Scanner } from '@yudiel/react-qr-scanner';
import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import useQrScan from '../../../hooks/useQrScan';

const QrScanButton = ({
    conferenceId,
    onScanSuccess,
    onScanError,
    disabled = false
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lastScannedValue, setLastScannedValue] = useState(null);
    const [cameraError, setCameraError] = useState(null);

    const handleSuccess = useCallback((data) => {
        onScanSuccess?.(data);
        setLastScannedValue(null);
        setIsModalOpen(false);
    }, [onScanSuccess]);

    const handleError = useCallback((error) => {
        onScanError?.(error);
        setTimeout(() => setLastScannedValue(null), 1200);
    }, [onScanError]);

    const {
        scan,
        isScanning,
        error: scanError
    } = useQrScan({
        conferenceId,
        onSuccess: handleSuccess,
        onError: handleError
    });

    useEffect(() => {
        if (!isModalOpen) {
            setLastScannedValue(null);
            setCameraError(null);
        }
    }, [isModalOpen]);

    const handleDetectedCodes = useCallback((detectedCodes) => {
        if (!detectedCodes?.length || isScanning) {
            return;
        }

        const value = detectedCodes?.[0]?.rawValue;

        if (!value || value === lastScannedValue) {
            return;
        }

        setLastScannedValue(value);
        scan(value);
    }, [isScanning, lastScannedValue, scan]);

    const handleCameraError = useCallback((error) => {
        console.error('QR scanner error:', error);
        setCameraError(error instanceof Error ? error.message : 'カメラの初期化に失敗しました。');
    }, []);

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-soft flex flex-col gap-4">
            <div>
                <h2 className="text-lg font-semibold text-foreground">現在地を更新</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    机に設置されたQRコードをスキャンして、現在地を更新しましょう。
                </p>
            </div>
            <Button
                variant="default"
                size="lg"
                fullWidth
                iconName="QrCode"
                onClick={() => {
                    if (!disabled) {
                        setIsModalOpen(true);
                    }
                }}
                disabled={disabled}
            >
                QRコードを読み取る
            </Button>
            {disabled && (
                <p className="text-xs text-muted-foreground">
                    ログインすると現在地を更新できます。
                </p>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
                    <div className="bg-card border border-border rounded-xl shadow-soft w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                            <h3 className="text-base font-semibold text-foreground">QRコードをスキャン</h3>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div className="rounded-lg overflow-hidden border border-border bg-muted relative aspect-square">
                                {cameraError && (
                                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-error bg-error/10">
                                        {cameraError}
                                    </div>
                                )}
                                {!cameraError && (
                                    <Scanner
                                        onScan={handleDetectedCodes}
                                        onError={handleCameraError}
                                        paused={isScanning}
                                        constraints={{ facingMode: 'environment' }}
                                        styles={{
                                            container: { width: '100%', height: '100%' },
                                            video: { objectFit: 'cover' }
                                        }}
                                        classNames={{
                                            container: 'w-full h-full',
                                            video: 'w-full h-full object-cover'
                                        }}
                                    />
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                スキャンに数秒かかる場合があります。読み取りに失敗した場合はQRコードを中央に合わせてください。
                            </div>
                            {(scanError || cameraError) && (
                                <div className="text-sm text-error">
                                    {scanError?.message || cameraError}
                                </div>
                            )}
                            <Button
                                variant="secondary"
                                onClick={() => setIsModalOpen(false)}
                                disabled={isScanning}
                                fullWidth
                            >
                                キャンセル
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QrScanButton;
