import { Link } from 'react-router-dom';
import Icon from '../components/AppIcon';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 shadow-soft text-center">
                <div className="flex justify-center mb-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl">
                        <Icon
                            name="FileX"
                            size={32}
                            color="var(--color-primary)"
                            strokeWidth={2}
                        />
                    </div>
                </div>

                <h1 className="text-2xl font-semibold text-foreground mb-2">
                    ページが見つかりません
                </h1>

                <p className="text-sm text-muted-foreground mb-6">
                    お探しのページは存在しないか、移動された可能性があります。
                </p>

                <Link
                    to="/"
                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    <Icon
                        name="Home"
                        size={16}
                        color="currentColor"
                        strokeWidth={2}
                        className="mr-2"
                    />
                    ホームに戻る
                </Link>
            </div>
        </div>
    );
};

export default NotFound;
