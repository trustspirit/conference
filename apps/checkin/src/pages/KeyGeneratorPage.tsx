import KeyGenerator from '../components/key-generator/KeyGenerator'
import '../styles/key-generator.css'

function KeyGeneratorPage() {
  return (
    <div className="kg-app">
      <div className="kg-container">
        <header className="kg-header">
          <h1>Key Generator</h1>
          <p>이름과 생년월일을 입력하여 고유 키를 생성하세요</p>
        </header>
        <main className="kg-main">
          <KeyGenerator />
        </main>
      </div>
    </div>
  )
}

export default KeyGeneratorPage
