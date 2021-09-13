const form = document.querySelector('form')

form.addEventListener('submit',async (e) => {
    e.preventDefault()
    const username = document.querySelector('#usernameField').value
    if(username === ''){
        alert('Please provide your name')
        return
    }
    console.log('New Username : '+username+" Room Id : "+room)
    window.location = `/meeting/${username}/${room}`
})