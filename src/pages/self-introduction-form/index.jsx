import { useState } from 'react';
import Header from '../../components/ui/Header';
import Toast from '../../components/ui/Toast';
import FormActions from './components/FormActions';
import FormField from './components/FormField';
import FormHeader from './components/FormHeader';
import VisibilityToggle from './components/VisibilityToggle';

const SelfIntroductionForm = () => {
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        affiliation: '',
        researchTopic: '',
        interests: '',
        oneLiner: ''
    });

    // UI state
    const [isPublic, setIsPublic] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState({
        isVisible: false,
        message: '',
        type: 'success'
    });

    // Form validation
    const validateForm = () => {
        const newErrors = {};

        if (!formData?.name?.trim()) {
            newErrors.name = "お名前は必須項目です";
        }

        if (formData?.oneLiner?.length > 120) {
            newErrors.oneLiner = "一言メッセージは120文字以内で入力してください";
        }

        setErrors(newErrors);
        return Object.keys(newErrors)?.length === 0;
    };

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e?.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors?.[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e?.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            // Simulate API call with mock data
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Generate mock ID
            const generatedId = `INTRO-${Date.now()?.toString()?.slice(-6)}`;

            // Show success toast
            setToast({
                isVisible: true,
                message: `自己紹介が保存されました！ID: ${generatedId}`,
                type: 'success'
            });

            // Reset form after successful submission
            setTimeout(() => {
                handleReset();
            }, 3000);

        } catch (error) {
            setToast({
                isVisible: true,
                message: "保存中にエラーが発生しました。もう一度お試しください。",
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle form reset
    const handleReset = () => {
        setFormData({
            name: '',
            affiliation: '',
            researchTopic: '',
            interests: '',
            oneLiner: ''
        });
        setIsPublic(true);
        setErrors({});
    };

    // Check if form is valid
    const isFormValid = formData?.name?.trim()?.length > 0 && formData?.oneLiner?.length <= 120;

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-2xl mx-auto">
                    {/* Form Header */}
                    <FormHeader className="mb-8" />

                    {/* Main Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-6">
                            {/* Name Field - Required */}
                            <FormField
                                type="text"
                                label="お名前"
                                name="name"
                                value={formData?.name}
                                onChange={handleInputChange}
                                placeholder="山田太郎"
                                required
                                error={errors?.name}
                                description="学会での表示名として使用されます"
                            />

                            {/* Affiliation Field - Optional */}
                            <FormField
                                type="text"
                                label="所属"
                                name="affiliation"
                                value={formData?.affiliation}
                                onChange={handleInputChange}
                                placeholder="東京大学 工学部"
                                description="大学、企業、研究機関など"
                                error={errors?.affiliation}
                                maxLength={undefined}
                            />

                            {/* Research Topic Field - Optional */}
                            <FormField
                                type="text"
                                label="研究テーマ"
                                name="researchTopic"
                                value={formData?.researchTopic}
                                onChange={handleInputChange}
                                placeholder="機械学習を用いた画像認識"
                                description="現在取り組んでいる研究分野"
                                error={errors?.researchTopic}
                                maxLength={undefined}
                            />

                            {/* Interests Field - Optional */}
                            <FormField
                                type="text"
                                label="興味・関心"
                                name="interests"
                                value={formData?.interests}
                                onChange={handleInputChange}
                                placeholder="深層学習, コンピュータビジョン, 自然言語処理"
                                description="カンマ区切りで複数入力可能"
                                error={errors?.interests}
                                maxLength={undefined}
                            />

                            {/* One-liner Message Field - Optional with character limit */}
                            <FormField
                                type="text"
                                label="一言メッセージ"
                                name="oneLiner"
                                value={formData?.oneLiner}
                                onChange={handleInputChange}
                                placeholder="研究を通じて社会に貢献したいと思っています！"
                                error={errors?.oneLiner}
                                description="参加者への簡単な挨拶やメッセージ"
                                maxLength={120}
                                showCharacterCounter={true}
                            />
                        </div>

                        {/* Visibility Toggle */}
                        <VisibilityToggle
                            isPublic={isPublic}
                            onChange={setIsPublic}
                        />

                        {/* Form Actions */}
                        <FormActions
                            onSubmit={handleSubmit}
                            onReset={handleReset}
                            isLoading={isLoading}
                            isValid={isFormValid}
                        />
                    </form>
                </div>
            </main>
            {/* Toast Notification */}
            <Toast
                message={toast?.message}
                type={toast?.type}
                isVisible={toast?.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                duration={5000}
                position="top"
            />
        </div>
    );
};

export default SelfIntroductionForm;