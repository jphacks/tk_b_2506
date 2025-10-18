import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Routes from "./Routes";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1
        }
    }
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Routes />
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
