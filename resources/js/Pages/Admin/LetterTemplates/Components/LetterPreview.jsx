import NotaDinasPreview from "./NotaDinasPreview";

export default function LetterPreview({ html, metadata, onPageCountChange }) {
    return <NotaDinasPreview html={html} metadata={metadata} onPageCountChange={onPageCountChange} />;
}
