import { useMemo, useState } from 'react';

const defaultMapForm = {
    venueName: '',
    location: '',
    floor: '',
    fileName: '',
    notes: ''
};

const defaultPresentationForm = {
    title: '',
    presenter: '',
    session: '',
    room: '',
    scheduledAt: '',
    tags: ''
};

const createId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const AdminDashboard = ({ onLogout, adminEmail }) => {
    const [mapForm, setMapForm] = useState(defaultMapForm);
    const [maps, setMaps] = useState([]);
    const [presentations, setPresentations] = useState([]);
    const [presentationForm, setPresentationForm] = useState(defaultPresentationForm);
    const [abstractText, setAbstractText] = useState('');
    const [summaryResult, setSummaryResult] = useState('');
    const [summaryTags, setSummaryTags] = useState([]);

    const isMapFormValid = useMemo(() => {
        return mapForm.venueName.trim() && mapForm.location.trim();
    }, [mapForm]);

    const isPresentationFormValid = useMemo(() => {
        return presentationForm.title.trim() && presentationForm.presenter.trim();
    }, [presentationForm]);

    const handleMapInputChange = (event) => {
        const { name, value, files } = event.target;
        if (name === 'mapFile' && files?.length) {
            setMapForm((prev) => ({
                ...prev,
                fileName: files[0].name
            }));
            return;
        }

        setMapForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddMap = (event) => {
        event.preventDefault();
        if (!isMapFormValid) {
            return;
        }

        setMaps((prev) => {
            return [
                ...prev,
                {
                    id: createId(),
                    ...mapForm,
                    createdAt: new Date().toISOString()
                }
            ];
        });
        setMapForm(defaultMapForm);
    };

    const handlePresentationInputChange = (event) => {
        const { name, value } = event.target;
        setPresentationForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddPresentation = (event) => {
        event.preventDefault();
        if (!isPresentationFormValid) {
            return;
        }

        const tagList = presentationForm.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

        setPresentations((prev) => {
            return [
                ...prev,
                {
                    id: createId(),
                    title: presentationForm.title,
                    presenter: presentationForm.presenter,
                    session: presentationForm.session,
                    room: presentationForm.room,
                    scheduledAt: presentationForm.scheduledAt,
                    tags: tagList,
                    createdAt: new Date().toISOString()
                }
            ];
        });

        setPresentationForm(defaultPresentationForm);
    };

    const handleGenerateSummary = (event) => {
        event.preventDefault();
        if (!abstractText.trim()) {
            setSummaryResult('');
            setSummaryTags([]);
            return;
        }

        const normalized = abstractText.trim().replace(/\s+/g, ' ');
        const snippet = normalized.slice(0, 160);
        const mockSummary = `要約（モック）: ${snippet}${normalized.length > 160 ? '…' : ''}`;

        const keywordCandidates = normalized
            .split(/[^a-zA-Z0-9\u3040-\u30FF\u4E00-\u9FFF]+/)
            .filter((token) => token.length > 3)
            .slice(0, 5);

        const mockTags = keywordCandidates.length
            ? keywordCandidates
            : ['AI分析', '要約', 'タグ生成'];

        setSummaryResult(mockSummary);
        setSummaryTags(mockTags);
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>管理コンソール</h2>
                    <p>{adminEmail}</p>
                </div>
                <nav className="sidebar-nav">
                    <a href="#venue">会場マップ</a>
                    <a href="#presentations">プレゼン登録</a>
                    <a href="#abstract">AI要約</a>
                </nav>
                <button
                    className="secondary-button"
                    onClick={onLogout}
                >
                    ログアウト
                </button>
            </aside>

            <main className="dashboard-content">
                <section id="venue" className="panel">
                    <header className="panel-header">
                        <div>
                            <h3>会場マップの登録</h3>
                            <p>フロアマップやセッション配置図をアップロードできます。</p>
                        </div>
                    </header>
                    <form className="form-grid" onSubmit={handleAddMap}>
                        <label className="form-label" htmlFor="venueName">会場名</label>
                        <input
                            id="venueName"
                            name="venueName"
                            className="form-input"
                            value={mapForm.venueName}
                            onChange={handleMapInputChange}
                            placeholder="国際会議場 A"
                            required
                        />

                        <label className="form-label" htmlFor="location">場所</label>
                        <input
                            id="location"
                            name="location"
                            className="form-input"
                            value={mapForm.location}
                            onChange={handleMapInputChange}
                            placeholder="京都市 左京区"
                            required
                        />

                        <label className="form-label" htmlFor="floor">フロア / エリア</label>
                        <input
                            id="floor"
                            name="floor"
                            className="form-input"
                            value={mapForm.floor}
                            onChange={handleMapInputChange}
                            placeholder="3F メインホール"
                        />

                        <label className="form-label" htmlFor="mapFile">マップファイル</label>
                        <input
                            id="mapFile"
                            name="mapFile"
                            type="file"
                            className="form-input"
                            accept=".png,.jpg,.jpeg,.pdf"
                            onChange={handleMapInputChange}
                        />
                        {mapForm.fileName && <p className="form-hint">選択中: {mapForm.fileName}</p>}

                        <label className="form-label" htmlFor="notes">備考</label>
                        <textarea
                            id="notes"
                            name="notes"
                            className="form-textarea"
                            value={mapForm.notes}
                            onChange={handleMapInputChange}
                            placeholder="セッション受付や展示エリアなどのメモ"
                            rows={3}
                        />

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={!isMapFormValid}
                        >
                            登録する
                        </button>
                    </form>

                    {maps.length > 0 && (
                        <div className="list">
                            {maps.map((item) => (
                                <article key={item.id} className="list-item">
                                    <h4>{item.venueName}</h4>
                                    <p>{item.location} {item.floor ? ` / ${item.floor}` : ''}</p>
                                    {item.fileName && <p>添付: {item.fileName}</p>}
                                    {item.notes && <p className="muted">{item.notes}</p>}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section id="presentations" className="panel">
                    <header className="panel-header">
                        <div>
                            <h3>プレゼンテーション登録</h3>
                            <p>登壇情報を入力し、タグを付与します。</p>
                        </div>
                    </header>

                    <form className="form-grid" onSubmit={handleAddPresentation}>
                        <label className="form-label" htmlFor="title">タイトル</label>
                        <input
                            id="title"
                            name="title"
                            className="form-input"
                            value={presentationForm.title}
                            onChange={handlePresentationInputChange}
                            placeholder="次世代ロボティクスにおけるAIの応用"
                            required
                        />

                        <label className="form-label" htmlFor="presenter">発表者</label>
                        <input
                            id="presenter"
                            name="presenter"
                            className="form-input"
                            value={presentationForm.presenter}
                            onChange={handlePresentationInputChange}
                            placeholder="山田 太郎（ABC大学）"
                            required
                        />

                        <label className="form-label" htmlFor="session">セッション</label>
                        <input
                            id="session"
                            name="session"
                            className="form-input"
                            value={presentationForm.session}
                            onChange={handlePresentationInputChange}
                            placeholder="AI-01"
                        />

                        <label className="form-label" htmlFor="room">会場・場所</label>
                        <input
                            id="room"
                            name="room"
                            className="form-input"
                            value={presentationForm.room}
                            onChange={handlePresentationInputChange}
                            placeholder="ホールB"
                        />

                        <label className="form-label" htmlFor="scheduledAt">日時</label>
                        <input
                            id="scheduledAt"
                            name="scheduledAt"
                            className="form-input"
                            type="datetime-local"
                            value={presentationForm.scheduledAt}
                            onChange={handlePresentationInputChange}
                        />

                        <label className="form-label" htmlFor="tags">タグ（カンマ区切り）</label>
                        <input
                            id="tags"
                            name="tags"
                            className="form-input"
                            value={presentationForm.tags}
                            onChange={handlePresentationInputChange}
                            placeholder="AI, ロボティクス, 制御"
                        />

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={!isPresentationFormValid}
                        >
                            追加する
                        </button>
                    </form>

                    {presentations.length > 0 && (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>タイトル</th>
                                    <th>発表者</th>
                                    <th>セッション</th>
                                    <th>会場</th>
                                    <th>日時</th>
                                    <th>タグ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {presentations.map((presentation) => (
                                    <tr key={presentation.id}>
                                        <td>{presentation.title}</td>
                                        <td>{presentation.presenter}</td>
                                        <td>{presentation.session}</td>
                                        <td>{presentation.room}</td>
                                        <td>{presentation.scheduledAt}</td>
                                        <td>
                                            {presentation.tags.length > 0
                                                ? presentation.tags.join(', ')
                                                : '未設定'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                <section id="abstract" className="panel">
                    <header className="panel-header">
                        <div>
                            <h3>AIによる抄録要約（モック）</h3>
                            <p>抄録テキストを貼り付けて、モックの要約とタグを生成します。</p>
                        </div>
                    </header>

                    <form className="form-grid" onSubmit={handleGenerateSummary}>
                        <label className="form-label" htmlFor="abstractInput">抄録テキスト</label>
                        <textarea
                            id="abstractInput"
                            className="form-textarea"
                            value={abstractText}
                            onChange={(event) => setAbstractText(event.target.value)}
                            placeholder="ここに抄録を貼り付けてください。"
                            rows={8}
                            required
                        />
                        <button type="submit" className="primary-button">
                            要約を生成
                        </button>
                    </form>

                    {summaryResult && (
                        <div className="summary-card">
                            <h4>生成結果</h4>
                            <p>{summaryResult}</p>
                            <div className="tag-list">
                                {summaryTags.map((tag) => (
                                    <span key={tag} className="tag">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default AdminDashboard;
