import KeyGenerator from './components/KeyGenerator'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Key Generator</h1>
        <p>이름과 연락처를 입력하여 고유 키를 생성하세요</p>
      </header>
      <main className="main">
        <KeyGenerator />
      </main>
    </div>
  )
}

export default App
